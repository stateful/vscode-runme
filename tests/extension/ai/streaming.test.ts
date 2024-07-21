import { test } from 'vitest'
import { vi } from 'vitest'

import getLogger from '../../../src/extension/logger'
import * as stream from '../../../src/extension/ai/stream'
import {
  Observable,
  lastValueFrom,
  Subscriber,
  from,
  Subject,
  windowCount,
  map,
  mergeAll,
  EmptyError,
  tap,
  finalize,
} from 'rxjs'

import {
  StreamGenerateRequest,
  FullContext,
  BlockUpdate,
  StreamGenerateResponse,
} from './foyle/v1alpha1/agent_pb'

const log = getLogger()

vi.mock('vscode', async () => {
  const vscode = await import('../../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})

function createSource(): Observable<string> {
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

  // We need to create a generator to bind the index and value to the callback
  function createCallback(
    index: number,
    value: string,
    s: Subscriber<string>,
    close: boolean,
  ): () => void {
    return () => {
      console.log(`Emitting data[${index}]: ${value}]}`)
      s.next(value)
      if (close) {
        // We need to close the pipe otherwise the test will complete.
        s.complete()
      }
    }
  }

  return new Observable((subscriber) => {
    console.log(`Emitting data[0]: ${data[0]}`)
    subscriber.next(data[0])
    for (let i = 1; i < data.length; i++) {
      // We need to delay each successive data point by 2 seconds to simulate typing
      // The timeouts are asynchronous which is why we need to increase the timeout for each item
      let f = createCallback(i, data[i], subscriber, i === data.length - 1)
      setTimeout(f, 1000 * i)
    }
  })
}

// Increase the timeout for this test
// Create a manual test for working with the foyle AI service
test.skipIf(process.env.RUN_MANUAL_TESTS !== 'true')(
  'manual foyle streaming RPC test',
  async () => {
    let source: Observable<string> = createSource()

    let creator = new stream.StreamCreator()

    let final = source.pipe(
      // Use tap and map since we don't transform any values
      tap({
        next: (event) => creator.handleEvent(event),
        error: (err) => console.error('Error in stream:', err),
      }),
      finalize(() => {
        console.log('Stream completed, cleaning up StreamCreator')
        creator.shutdown() // You'll need to implement this method
      }),
    )

    let lastVal = await lastValueFrom(final)
    console.log(`final Value: ${lastVal}`)

    // Await any promises for the requests
    for (const p of stream.processedEvents) {
      let value = await p
      console.log(`processed value: ${value}`)
    }
    // // Create a subscription to the observable
    // let responseIterables: Observable<AsyncIterable<StreamGenerateResponse>> =
    //   stream.callStreamGenerate(source)

    // // Create a subscription to the observable
    // responseIterables.forEach(async (responseIterable) => {
    //   for await (const response of responseIterable) {
    //     log.info('response:', response)
    //   }
    // })

    // await lastValueFrom(responseIterables)
  },
  // Increase the test timeout
  60000,
  //const observable: Observable<string> = from(data)
  //await stream.streamObservable(observable, 0)
  //await stream.callStreamGenerate()
  //await main()
  //
)

// async function main() {
//   // Create an array of strings
//   const steps = ['one step', 'two step', 'three step']

//   // Create an Observable from the array
//   const observable: Observable<string> = from(steps)

//   const asyncIterable = stream.observableToIterable(observable)

//   // Loop over the AsyncIterable and print the strings
//   for await (const step of asyncIterable) {
//     console.log(step)
//   }
// }
