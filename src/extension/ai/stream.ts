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

// Create a client
const client = createPromiseClient(AIService, createDefaultTransport())

export const processedEvents: Promise<number>[] = []

// StreamCreator processes a stream of events.
// These events are split into windows and then turned into a stream of requests.
export class StreamCreator {
  lastIterator: PromiseIterator<StreamGenerateRequest> | null = null

  // handleEvent is that processes an event
  // n.b we use arror function definition to ensure this gets properly bound
  // see https://www.typescriptlang.org/docs/handbook/2/classes.html#this-at-runtime-in-classes
  handleEvent = (event: string): void => {
    if (this.lastIterator !== undefined && this.lastIterator !== null && event === 'stop') {
      console.log('Stopping the current stream')
      this.lastIterator.completed = true
      this.lastIterator = null
      return
    }
    if (this.lastIterator === null) {
      this.lastIterator = new PromiseIterator<StreamGenerateRequest>()
      // start the bidirectional stream
      let iterable = {
        [Symbol.asyncIterator]: () => {
          return this.lastIterator!
        },
      }

      const responseIterable = client.streamGenerate(iterable)
      // Hack: Add them to global variable so we can await them later
      processedEvents.push(processResponses(responseIterable))
    }

    this.lastIterator.enQueue(
      new StreamGenerateRequest({
        request: {
          case: 'update',
          value: new BlockUpdate({
            blockId: 'block-1',
            blockContent: event,
          }),
        },
      }),
    )
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
        // If the has completed, return done
        res({ value: undefined, done: true })
      } else {
        // Store the resolve and reject functions so that we can
        outer.pending = new PromiseFunctions(res, rej)
      }
    })
  }

  return(): Promise<IteratorResult<T>> {
    //subscription.unsubscribe()
    return Promise.resolve({ value: undefined, done: true })
  }
  // The connect method requires this method to be implemented even though it is optional in AsyncIterable.
  // TODO(jeremy): Presumably this is where we need to add error handling.
  throw(err: any) {
    //subscription.unsubscribe()
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

function iterableToObservable<T>(asyncIterable: AsyncIterable<T>): Observable<T> {
  return new Observable<T>((observer) => {
    const process = async () => {
      try {
        for await (const value of asyncIterable) {
          observer.next(value)
        }
        observer.complete()
      } catch (error) {
        observer.error(error)
      }
    }

    process()

    return () => {
      // If the AsyncIterable has a method to cancel or stop iteration, call it here
      // For example: asyncIterable.cancel();
    }
  })
}

// // processEvent is a function that processes an event
// function processEvent(event: string) {
//   console.log('Event:', event)
// }

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

// streamObservable takes an Observable<string> repsenting a stream of strings.
// This stream is mapped onto a streaming RPC call to the AI service.
export function streamObservable(
  inputPipe: Observable<string>,
  streamCount: number,
): AsyncIterable<StreamGenerateRequest> {
  try {
    console.log(`streamObservable: Stream Count: ${streamCount}`)
    let count = 0
    const requestPipe = inputPipe.pipe(
      map((value: string): StreamGenerateRequest => {
        const blockUpdate = new StreamGenerateRequest({
          request: {
            case: 'update',
            value: new BlockUpdate({
              blockId: `stream-${streamCount}-${count}`,
              blockContent: value,
            }),
          },
        })
        count++
        return blockUpdate
      }),
    )

    let requestPipeIterable: AsyncIterable<StreamGenerateRequest> =
      observableToIterable(requestPipe)

    return requestPipeIterable
    //   // Start the bidirectional stream
    //   const responseIterable = client.streamGenerate(requestPipeIterable)

    //   // Await all responses
    //   console.log('Waiting for responses...')
    //   for await (const response of responseIterable) {
    //     console.log('Block Recieved:', response)
    //   }
    //   console.log('All responses recieved')
    //   console.log('Stream closeds...')

    //   //return responses
  } catch (error) {
    console.error('Error in StreamGenerate:', error)
    throw error
  }
}

export function callStreamGenerate(
  inputPipe: Observable<string>,
): Observable<AsyncIterable<StreamGenerateResponse>> {
  try {
    // const inputPipe: Observable<string> = from(data).pipe(
    //   map((value: string) => {
    //     console.log(`Input Value: ${value}`)
    //     return value
    //   }),
    // )

    // windowTrigger$ is an Observable indicating when a new window should be started
    // The $ suffix is just a convention to indicate that this is an Observable.
    const windowTrigger$ = inputPipe.pipe(
      filter((lyric) => {
        console.log(`Lyric: ${lyric}`)
        const startWindow = lyric === 'stop'
        console.log(`Start Window: ${startWindow}`)
        return startWindow
      }),
    )

    // windowed is an Observable of Observables. Each inner Observable will be a stream
    // corresponding to the items in the window. We will turn each of these streams into
    // separate Streaming request and cell generation
    let windowed: Observable<Observable<string>> = inputPipe.pipe(
      map((value: string): string => {
        console.log(`Input Value: ${value}`)
        return value
      }),
      windowCount(2),
      // Start a new window when click value is greater than 0.5
      //window(windowTrigger$),
      // TODO(jeremy); I think we could apply rate limiting here.
      map((win) => {
        console.log('Windowed called')
        return win
      }),
      //map((win) => win.pipe(take(3))), // take at most 3 emissions from each window
      // The mergeAll() operator subscribes to each of these window Observables as soon as they're created,
      // and immediately starts emitting values from them.
      //mergeAll(), // flatten the Observable-of-Observables
    )

    let streamCount = 0

    let final: Observable<AsyncIterable<StreamGenerateResponse>> = windowed.pipe(
      // Turn Observable of string into observable of StreamGenerateRequest
      map((subStream: Observable<string>): AsyncIterable<StreamGenerateResponse> => {
        // Turn each observable into a request
        const requestIterable: AsyncIterable<StreamGenerateRequest> = streamObservable(
          subStream,
          streamCount,
        )
        streamCount++
        // start the bidirectional stream
        const responseIterable = client.streamGenerate(requestIterable)

        //return  iterableToObservable(responseIterable)
        return responseIterable
        // const observeResponses: Observable<StreamGenerateResponse> =
        //   iterableToObservable(responseIterable)

        // return observeResponses.pipe(
        //   map((response: StreamGenerateResponse): StreamGenerateResponse => {
        //     console.log('Block Recieved:', response)
        //     return response
        //   }),
        // )
      }),
    )

    return final

    // Without the lastValueFrom, the stream will not start because we won't subscribe to it
    // lastValueFrom(
    //   subStream.pipe(
    //     map((value: string): void => {
    //       console.log(`Value: ${value} StreamCount: ${streamCount}`)
    //     }),
    //   ),
    // ).catch((error) => {
    //   if (error instanceof EmptyError) {
    //     // This means we started a new window but ended up not getting any items in that window.
    //     console.log('No values were emitted by the Observable')
    //     return 'No windows were processed'
    //   }
    //   throw error // Re-throw if it's not an EmptyError
    // })

    //return 'done'
    //}),
    // We flatten the Observable of Observables into a single Observable
    // Each inner Observable will be a stream corresponding to the items in the window
    //mergeAll(), // flatten the Observable-of-Observables
    // map((requests: Observable<StreamGenerateRequest>): AsyncIterable<StreamGenerateResponse> => {
    //   const requestIterable = observableToIterable(requests)
    //   // Start the bidirectional stream
    //   return client.streamGenerate(requestIterable)
    //   // for await (const response of responseIterable) {
    //   //   console.log('Block Recieved:', response)
    //   // }
    // }),
    // map(async (responseIterable: AsyncIterable<StreamGenerateResponse>) => {
    //   // Await all responses
    //   console.log('Waiting for responses...')
    //   for await (const response of responseIterable) {
    //     console.log('Block Recieved:', response)
    //   }
    //   console.log('All responses recieved')
    //   console.log('Stream closeds...')
    // }),

    // Wait for the last stream to be completed
    //await lastValueFrom(final)
    //return responses
  } catch (error) {
    console.error('Error in StreamGenerate:', error)
    throw error
  }
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
