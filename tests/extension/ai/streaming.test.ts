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
    await stream.callStreamGenerate()
    //await main()
    log.info('Starting manual test for foyle streaming RPC')
  },
)

async function main() {
  // Create an array of strings
  const steps = ['one step', 'two step', 'three step']

  // Create an Observable from the array
  const observable: Observable<string> = from(steps)

  const asyncIterable = stream.observableToIterable(observable)

  // Loop over the AsyncIterable and print the strings
  for await (const step of asyncIterable) {
    console.log(step)
  }
}
