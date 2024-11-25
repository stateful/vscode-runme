import * as crypto from 'node:crypto'

import { expect, vi, beforeEach, describe, it } from 'vitest'
import { Uri, ExtensionContext, workspace } from 'vscode'
import fetch from 'node-fetch'
import jwt from 'jsonwebtoken'

import { StatefulAuthProvider } from '../../../src/extension/provider/statefulAuth'
import { RunmeUriHandler } from '../../../src/extension/handler/uri'
import { getRunmeAppUrl } from '../../../src/utils/configuration'
import { Kernel } from '../../../src/extension/kernel'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('node-fetch')

vi.mock('../../../src/utils/configuration', () => {
  return {
    getRunmeAppUrl: vi.fn(() => 'https://api.for.platform'),
    getDeleteAuthToken: vi.fn(() => true),
    getAuthTokenPath: vi.fn(() => '/path/to/auth/token'),
  }
})

const contextFake: ExtensionContext = {
  extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
  secrets: {
    store: vi.fn(),
  },
  subscriptions: [],
} as any

const uriHandlerFake: RunmeUriHandler = {} as any
const kernelFake: Kernel = {} as any

StatefulAuthProvider.initialize(contextFake, kernelFake, uriHandlerFake)

describe('StatefulAuthProvider', () => {
  let provider: StatefulAuthProvider

  beforeEach(() => {
    provider = StatefulAuthProvider.instance
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
  it('returns a secret key for production', () => {
    // access private prop
    expect(StatefulAuthProvider.sessionSecretKey).toEqual(
      'stateful.sessions.8e0b4f45d990c8b235d4036020299d4af5c8c4a0',
    )
  })

  it('includes a hashed URL of the stage into the secret key', () => {
    const fakeStagingUrl = 'https://api.staging.for.platform'
    vi.mocked(getRunmeAppUrl).mockReturnValue(fakeStagingUrl)
    const hashed = crypto.createHash('sha1').update(fakeStagingUrl).digest('hex')

    // access private prop
    const sessionSecretKey = StatefulAuthProvider.sessionSecretKey

    expect(sessionSecretKey).toContain(hashed)
    expect(sessionSecretKey).toEqual('stateful.sessions.5d458b91cb755f8e839839dd3d1b4d597bba2c11')
  })
})

describe('StatefulAuthProvider#bootstrapFromToken', () => {
  beforeEach(() => {
    vi.mocked(getRunmeAppUrl).mockReturnValue('https://api.stateful.dev/')
  })

  it('returns undefined if no token is provided', async () => {
    vi.mocked(workspace.fs.stat).mockRejectedValueOnce({} as any)
    const sessionCreated = await StatefulAuthProvider.bootstrapFromToken()
    expect(sessionCreated).toBeFalsy()
  })

  it('returns true if token provided is valid', async () => {
    const token = jwt.sign(
      {
        iss: 'Runme',
        aud: 'XXXXXXXXXXXXXXXXXXXXXXXX',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        sub: 'XXXXXXXXXXXX',
        scope: 'profile email',
      },
      'secret',
    )

    vi.mocked(workspace.fs.stat).mockResolvedValueOnce({} as any)
    vi.mocked(workspace.fs.readFile).mockResolvedValueOnce(Buffer.from(token))
    vi.mocked(workspace.fs.delete).mockResolvedValueOnce()
    vi.mocked(fetch).mockResolvedValueOnce(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            email: 'john@doe.com',
            name: 'John Doe',
          }),
      }) as any,
    )
    const spyStore = vi.spyOn(contextFake.secrets, 'store')
    const spyDelete = vi.spyOn(workspace.fs, 'delete')
    const sessionCreated = await StatefulAuthProvider.bootstrapFromToken()

    expect(sessionCreated).toBeTruthy()
    expect(spyStore).toHaveBeenCalledOnce()
    expect(spyDelete).toHaveBeenCalledOnce()
  })

  it('returns true if token provided is invalid', async () => {
    const token = jwt.sign(
      {
        iss: 'Runme',
        aud: 'XXXXXXXXXXXXXXXXXXXXXXXX',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        sub: 'XXXXXXXXXXXX',
        scope: 'profile email',
      },
      'secret',
    )

    vi.mocked(workspace.fs.stat).mockResolvedValueOnce({} as any)
    vi.mocked(workspace.fs.readFile).mockResolvedValueOnce(Buffer.from(token))

    vi.mocked(fetch).mockResolvedValueOnce(
      Promise.resolve({
        status: 500,
        json: () => Promise.resolve({ status: 'foo', message: 'bar' }),
      }) as any,
    )
    const spyStore = vi.spyOn(contextFake.secrets, 'store')
    const spyDelete = vi.spyOn(workspace.fs, 'delete')
    const sessionCreated = await StatefulAuthProvider.bootstrapFromToken()

    expect(sessionCreated).toBeFalsy()
    expect(spyStore).not.toHaveBeenCalledOnce()
    expect(spyDelete).not.toHaveBeenCalledOnce()
  })
})
