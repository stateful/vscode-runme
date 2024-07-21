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
    let window = 0
    let windowed: Observable<Observable<string>> = source.pipe(
      // map((value: string): string => {
      //   console.log(`Input Value: ${value}`)
      //   return value
      // }),
      windowCount(2),
      // Start a new window when click value is greater than 0.5
      //window(windowTrigger$),
      // TODO(jeremy); I think we could apply rate limiting here.
      map(async (win: Observable<string>) => {
        window++

        win.pipe(
          map((value: string): string => {
            let result = `window-{window}-value-${value}`
            console.log(result)
            return result
          }),
        )
        // We need to subscript to it or it never completes
        let lastVal = await lastValueFrom(win).catch((err) => {
          if (err instanceof EmptyError) {
            // This means we started a new window but ended up not getting any items in that window.
            console.log('No values were emitted by the Observable')
            return 'No windows were processed'
          }
          console.error(err)
        })

        console.log(`Last Value: ${lastVal}`)
        return win
      }),
      //map((win) => win.pipe(take(3))), // take at most 3 emissions from each window
      // The mergeAll() operator subscribes to each of these window Observables as soon as they're created,
      // and immediately starts emitting values from them.
      mergeAll(), // flatten the Observable-of-Observables
    )

    await lastValueFrom(windowed)

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
