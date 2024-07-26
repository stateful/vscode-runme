import { createPromiseClient, Transport } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-node'
import { AIService } from './foyle/v1alpha1/agent_connect'
import {
  StreamGenerateRequest,
  FullContext,
  BlockUpdate,
  StreamGenerateResponse,
} from './foyle/v1alpha1/agent_pb'
import { Doc } from './foyle/v1alpha1/doc_pb'
import * as http2 from 'http2'
import {
  Observable,
  fromEventPattern,
  from,
  map,
  filter,
  window,
  mergeAll,
  lastValueFrom,
  mergeMap,
  concatMap,
  toArray,
  shareReplay,
  takeUntil,
  defer,
  windowCount,
  EmptyError,
  delay,
} from 'rxjs'

const baseUrl = 'http://localhost:8080/api'

// Create a client this is actually a PromiseClient
export const client = createPromiseClient(AIService, createDefaultTransport())

export const processedEvents: Promise<number>[] = []

// StreamGenerateResponseHandler is a function that processes a stream of StreamGenerateResponse
type StreamGenerateResponseHandler = (response: AsyncIterable<StreamGenerateResponse>) => void

// StreamCreator processes a stream of events.
// These events are split into windows and then turned into a stream of requests.
//
export class StreamCreator {
  lastIterator: PromiseIterator<StreamGenerateRequest> | null = null

  generateResponseHandler: StreamGenerateResponseHandler

  constructor(handler: StreamGenerateResponseHandler) {
    this.generateResponseHandler = handler
  }

  // handleEvent processes a request
  // n.b we use arror function definition to ensure this gets properly bound
  // see https://www.typescriptlang.org/docs/handbook/2/classes.html#this-at-runtime-in-classes
  handleEvent = (req: StreamGenerateRequest): void => {
    // Start a new stream when ever the full document gets sent
    if (
      this.lastIterator !== undefined &&
      this.lastIterator !== null &&
      req.request.case === 'fullContext'
    ) {
      console.log('Stopping the current stream')
      this.lastIterator.close()
      this.lastIterator = null
      return
    }
    if (this.lastIterator === null) {
      // n.b. we need to define newIterator and then refer to newIterator in the closure
      let newIterator = new PromiseIterator<StreamGenerateRequest>()
      this.lastIterator = newIterator
      // start the bidirectional stream
      let iterable = {
        [Symbol.asyncIterator]: () => {
          // n.b. We don't want to refer to this.lastIterator because we need to create a closure
          // this.lastIterator is a reference that will get be updated over time. We don't want the iterator though
          // to change.
          return newIterator
        },
      }

      const responseIterable = client.streamGenerate(iterable)
      // generateResponseHandler should be an async function
      // Thus by calling the async function gets started and then execution resumes immediately
      this.generateResponseHandler(responseIterable)
    }

    this.lastIterator.enQueue(req)
  }

  // shutdown should be invoked when the stream is to be stopped
  shutdown = (): void => {
    // Close the last iterator
    if (this.lastIterator !== undefined && this.lastIterator !== null) {
      console.log('Stopping the current stream')
      this.lastIterator.close()
      this.lastIterator = null
      return
    }
  }
}

class PromiseFunctions<T> {
  resolve: (value: T) => void
  reject: (error: any) => void
  constructor(res: (value: T) => void, rej: (error: any) => void) {
    this.resolve = res
    this.reject = rej
  }
}

async function processResponses(responses: AsyncIterable<StreamGenerateResponse>): Promise<number> {
  let count = 0
  for await (const response of responses) {
    count++
    console.log('Block Recieved:', response)
  }
  return count
}

// PromiseIterator implements the iterator protocol for an AsyncIterable.
// It is used to convert from a push based Observable to a pull based AsyncIterable.
// It implements the iterator protocol; wrapped around a list. The list is used
// to buffer values from the Observable. The iterator returns promises that get
// resolved by the Observable.
class PromiseIterator<T> {
  values: T[] = []

  // Keep track of the resolve and reject functions for the promise returned by next
  // That needs to be closed when the next value is added to the list.
  pending: PromiseFunctions<IteratorResult<T>> | null = null

  // resolve: (value: IteratorResult<T>) => void
  // reject: (error: any) => void | undefined = undefined
  completed = false
  error: any = null

  // enQueue the item to be returned by the iterator
  enQueue(item: T) {
    if (this.pending !== null) {
      this.pending.resolve({ value: item, done: false })
      this.pending = null
    } else {
      this.values.push(item)
    }
  }

  // Close the iterator
  close() {
    this.completed = true
    if (this.pending !== null) {
      this.pending.resolve({ value: undefined, done: true })
      this.pending = null
    }
  }

  // Implement the iterator protocol
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol
  next(): Promise<IteratorResult<T>> {
    let outer = this
    // Each call to next returns a promise. If we already have a value in the list, we return it.
    // If the list is empty, we store the resolve and reject functions so that we can invoke resolve when
    // a value is added to the list
    return new Promise<IteratorResult<T>>((res, rej) => {
      if (outer.error) {
        rej(outer.error)
      } else if (outer.values.length) {
        // If there is a value in the list, return it
        res({ value: outer.values.shift()!, done: false })
      } else if (outer.completed) {
        res({ value: undefined, done: true })
      } else {
        // Store the resolve and reject functions so that we can
        outer.pending = new PromiseFunctions(res, rej)
      }
    })
  }

  return(): Promise<IteratorResult<T>> {
    return Promise.resolve({ value: undefined, done: true })
  }
  // The connect method requires this method to be implemented even though it is optional in AsyncIterable.
  // TODO(jeremy): Presumably this is where we need to add error handling.
  throw(err: any) {
    console.log('Error in PromiseIterator:', err)
    return Promise.reject(err)
  }
}

// Function to convert an Observable to an AsyncIterable
export function observableToIterable<T>(observable: Observable<T>): AsyncIterable<T> {
  // Construct and return an AsyncIterable object. An AsyncIterable is any object
  // That has a property whose name is Symbol.asyncIterator and whose value is a function.
  // That returns an AsyncIterator iterator.
  return {
    // The notation [Symbol.asyncIterator] is a computed property name. It means define the property
    // whose name is the value of the Symbol.asyncIterator symbol.
    //
    // Observables are push based. The subscriber function is invoked for each value emitted by the observable.
    // Iterators are pull based. When next is invoked it pulls a value.
    // (see https://rxjs.dev/guide/observable).
    //
    // So to connect them we use a list to act as a buffer. The observable subscriber adds them to the list
    // and the iterator pulls them from the list.
    //
    // Since the iterator could be pulled before the observable has emitted any values, the iterator
    // actually returns a promise that is resolved immediately if there are values in the list, otherwise
    // it will resolve when the next item arrives.
    [Symbol.asyncIterator]: () => {
      const values: T[] = []
      let resolve: (value: IteratorResult<T>) => void
      let reject: (error: any) => void
      let completed = false
      let error: any = null

      const subscription = observable.subscribe({
        next: (value) => {
          if (resolve) {
            resolve({ value, done: false })
            resolve = undefined
          } else {
            values.push(value)
          }
        },
        error: (err) => {
          error = err
          if (reject) reject(err)
        },
        complete: () => {
          completed = true
          if (resolve) resolve({ value: undefined, done: true })
        },
      })

      // Construct and return an object implementating the iterator protocol
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol
      return {
        next: () => {
          return new Promise<IteratorResult<T>>((res, rej) => {
            if (error) {
              rej(error)
            } else if (values.length) {
              res({ value: values.shift()!, done: false })
            } else if (completed) {
              res({ value: undefined, done: true })
            } else {
              resolve = res
              reject = rej
            }
          })
        },
        return: () => {
          subscription.unsubscribe()
          return Promise.resolve({ value: undefined, done: true })
        },
        // The connect method requires this method to be implemented even though it is optional in AsyncIterable.
        // TODO(jeremy): Presumably this is where we need to add error handling.
        throw: (err: any) => {
          subscription.unsubscribe()
          return Promise.reject(err)
        },
      }
    },
  }
}

function createDefaultTransport(): Transport {
  return createConnectTransport({
    // Copied from https://github.com/connectrpc/examples-es/blob/656f27bbbfb218f1a6dce2c38d39f790859298f1/vanilla-node/client.ts#L25
    // Do we need to use http2?
    httpVersion: '2',
    // baseUrl needs to include the path prefix.
    baseUrl: baseUrl,
    nodeOptions: {
      // Create a custom HTTP/2 client
      createClient: (authority) => {
        return http2.connect(authority, {
          // Allow insecure HTTP connections
          rejectUnauthorized: false,
        })
      },
    },
  })
}

export async function callSimpleMethod() {
  // Create a FullContext message
  const fullContext = new FullContext({
    doc: new Doc({
      // Fill in the necessary fields for the Doc message
      // For example:
      // id: "example-doc",
      // blocks: [...],
    }),
    selected: 0,
  })

  // Create a StreamGenerateRequest message
  const request = new StreamGenerateRequest({
    request: {
      case: 'fullContext',
      value: fullContext,
    },
  })

  try {
    // Call the Simple method
    const response = await client.simple(request)
    console.log('Response received simple method:', response)

    // Process the response
    if (response.blocks) {
      response.blocks.forEach((block, index) => {
        console.log(`Block ${index + 1}:`, block)
      })
    } else {
      console.log('No blocks in the response.')
    }
  } catch (error) {
    console.error('Error calling Simple method:', error)
  }
}
