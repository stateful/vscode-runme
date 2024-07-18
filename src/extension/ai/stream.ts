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
} from 'rxjs'

const baseUrl = 'http://localhost:8080/api'

// Create a client
const client = createPromiseClient(AIService, createDefaultTransport())

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

export async function callStreamGenerate() {
  try {
    const data = [
      'hello',
      'how are you?',
      'stop',
      "Is it me you're looking for?",
      'stop',
      'here we go',
      'again',
      'down the only road I have ever known',
    ]

    const inputPipe: Observable<string> = from(data).pipe(shareReplay())
    const windowTrigger$ = inputPipe.pipe(
      filter((lyric) => lyric === 'stop'),
      shareReplay(),
    )

    const windows$ = inputPipe.pipe(
      window(windowTrigger$),
      map((window$, windowIndex) => ({ window$, windowIndex })),
      shareReplay(),
    )

    const result$ = windows$.pipe(
      mergeMap(({ window$, windowIndex }) =>
        defer(() => {
          let itemIndex = 0
          const requestObservable = window$.pipe(
            takeUntil(windowTrigger$),
            filter((lyric) => lyric !== 'stop'),
            map(
              (lyric) =>
                new StreamGenerateRequest({
                  request: {
                    case: 'update',
                    value: new BlockUpdate({
                      blockId: `stream-${windowIndex + 1}-item-${itemIndex++}`,
                      blockContent: lyric,
                    }),
                  },
                }),
            ),
          )

          const requestIterable = observableToIterable(requestObservable)
          return from(client.streamGenerate(requestIterable))
        }),
      ),
      mergeMap(async (responseIterable, windowIndex) => {
        console.log(`Processing responses for Window ${windowIndex + 1}`)
        for await (const response of responseIterable) {
          console.log(`Response received for Window ${windowIndex + 1}:`, response)
        }
        return `Completed Window ${windowIndex + 1}`
      }),
    )

    console.log('Starting stream processing...')
    const finalResult = await lastValueFrom(result$)
    console.log('All windows completed. Final result:', finalResult)
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
