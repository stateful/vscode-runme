import { expect, vi, beforeEach, describe, it } from 'vitest'
import { Uri, ExtensionContext } from 'vscode'

import { StatefulAuthProvider } from '../../../src/extension/provider/statefulAuth'
import { RunmeUriHandler } from '../../../src/extension/handler/uri'

vi.mock('vscode')
vi.mock('vscode-telemetry')

describe('StatefulAuthProvider', () => {
  let provider: StatefulAuthProvider

  beforeEach(() => {
    const contextMock: ExtensionContext = {
      extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
    } as any

    const uriHandler: RunmeUriHandler = {} as any

    provider = new StatefulAuthProvider(contextMock, uriHandler)
  })

  it('gets sessions', async () => {
    const sessions = await provider.getSessions()
    expect(sessions).toEqual([])
  })

  it('gets sessions with specific scopes', async () => {
    const sessions = await provider.getSessions(['profile'])
    expect(sessions).toEqual([])
  })
})
