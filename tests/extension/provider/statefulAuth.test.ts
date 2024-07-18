import * as crypto from 'node:crypto'

import { expect, vi, beforeEach, describe, it } from 'vitest'
import { Uri, ExtensionContext } from 'vscode'

import { StatefulAuthProvider } from '../../../src/extension/provider/statefulAuth'
import { RunmeUriHandler } from '../../../src/extension/handler/uri'
import { getRunmeAppUrl } from '../../../src/utils/configuration'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/utils/configuration', () => {
  return {
    getRunmeAppUrl: vi.fn(),
  }
})

const contextFake: ExtensionContext = {
  extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
} as any

const uriHandlerFake: RunmeUriHandler = {} as any

describe('StatefulAuthProvider', () => {
  let provider: StatefulAuthProvider

  beforeEach(() => {
    vi.mocked(getRunmeAppUrl).mockReturnValue('https://api.for.platform')
    provider = new StatefulAuthProvider(contextFake, uriHandlerFake)
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

describe('StatefulAuthProvider#sessionSecretKey', () => {
  let provider: StatefulAuthProvider

  it('returns a secret key for production', () => {
    provider = new StatefulAuthProvider(contextFake, uriHandlerFake)

    // access private prop
    expect((provider as any).sessionSecretKey).toEqual(
      'stateful.sessions.8e0b4f45d990c8b235d4036020299d4af5c8c4a0',
    )
  })

  it('includes a hashed URL of the stage into the secret key', () => {
    const fakeStagingUrl = 'https://api.staging.for.platform'
    vi.mocked(getRunmeAppUrl).mockReturnValue(fakeStagingUrl)

    provider = new StatefulAuthProvider(contextFake, uriHandlerFake)
    const hashed = crypto.createHash('sha1').update(fakeStagingUrl).digest('hex')

    // access private prop
    const sessionSecretKey = (provider as any).sessionSecretKey

    expect(sessionSecretKey).toContain(hashed)
    expect(sessionSecretKey).toEqual('stateful.sessions.5d458b91cb755f8e839839dd3d1b4d597bba2c11')
  })
})
