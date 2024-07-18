import { test } from 'vitest'
import { vi } from 'vitest'

import getLogger from '../../../src/extension/logger'
import * as stream from '../../../src/extension/ai/stream'
import { Observable, from } from 'rxjs'

const log = getLogger()

vi.mock('vscode', async () => {
  const vscode = await import('../../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})

// Create a manual test for working with the foyle AI service
test.skipIf(process.env.RUN_MANUAL_TESTS !== 'true')(
  'manual foyle streaming RPC test',
  async () => {
    //await stream.callStreamGenerate()
    await main()
    log.info('Starting manual test for foyle streaming RPC')
  },
)

async function main() {
  // Create an array of strings
  const steps = ['one step', 'two step', 'three step']

  // Create an Observable from the array
  const observable: Observable<string> = from(steps)

  // Convert the Observable to an AsyncIterable
  const asyncIterable = {
    // Define a property whose name is the value of Symbol.asyncIterator, and whose value is this arrow function.
    [Symbol.asyncIterator]: () => {
      // Buffer to store emitted values
      const values: string[] = []
      // Promise resolvers and rejectors
      // We define variables to store the resolve and reject functions
      let resolve: (value: IteratorResult<string>) => void
      let reject: (error: any) => void
      // Flags to track Observable state
      let completed = false
      let error: any = null

      // Subscribe to the Observable
      const subscription = observable.subscribe({
        next: (value) => {
          if (resolve) {
            // If there's a pending request, resolve it immediately
            resolve({ value, done: false })
            resolve = undefined
          } else {
            // Otherwise, buffer the value
            values.push(value)
          }
        },
        error: (err) => {
          // Store the error and reject any pending request
          error = err
          if (reject) reject(err)
        },
        complete: () => {
          // Mark as completed and resolve any pending request
          completed = true
          if (resolve) resolve({ value: undefined, done: true })
        },
      })

      // Return the AsyncIterator object
      return {
        next: () => {
          // Return a Promise that resolves to the next value
          return new Promise<IteratorResult<string>>((res, rej) => {
            if (error) {
              // If there was an error, reject the Promise
              rej(error)
            } else if (values.length) {
              // If there are buffered values, return the next one
              res({ value: values.shift()!, done: false })
            } else if (completed) {
              // If the Observable has completed, signal the end of iteration
              res({ value: undefined, done: true })
            } else {
              // If no value is available, store the resolve/reject functions
              // to be called when a value arrives or the Observable completes/errors
              resolve = res
              reject = rej
            }
          })
        },
        return: () => {
          // This method is called if the loop is broken early
          // Unsubscribe from the Observable and signal the end of iteration
          subscription.unsubscribe()
          return Promise.resolve({ value: undefined, done: true })
        },
      }
    },
  }

  // Loop over the AsyncIterable and print the strings
  for await (const step of asyncIterable) {
    console.log(step)
  }
}
