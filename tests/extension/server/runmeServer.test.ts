import fs from 'node:fs/promises'

import { suite, test, expect, vi, beforeEach } from 'vitest'
import { Uri, workspace } from 'vscode'
// eslint-disable-next-line max-len
import { HealthCheckResponse_ServingStatus } from '@buf/grpc_grpc.community_timostamm-protobuf-ts/grpc/health/v1/health_pb'

// eslint-disable-next-line import/order
import { isPortAvailable } from '../../../src/extension/utils'

import Server, { IServerConfig } from '../../../src/extension/server/runmeServer'
import RunmeServerError from '../../../src/extension/server/runmeServerError'
import { testCertPEM, testPrivKeyPEM } from '../../testTLSCert'

const healthCheck = vi.fn()

vi.mock('vscode')
vi.mock('../../../src/extension/grpc/client', () => ({
  initParserClient: vi.fn(),
  HealthClient: class {
    check = healthCheck
  },
}))

vi.mock('../../../src/extension/utils', () => ({
  isPortAvailable: vi.fn(async () => true),
  isWindows: vi.fn().mockReturnValue(false),
}))

vi.mock('node:fs/promises', async () => ({
  default: {
    access: vi.fn().mockResolvedValue(false),
    stat: vi.fn().mockResolvedValue({
      isFile: vi.fn().mockReturnValue(false),
    }),
    readFile: vi.fn().mockImplementation((filePath) => {
      if (filePath.toString().endsWith('cert.pem')) {
        return testCertPEM
      }

      if (filePath.toString().endsWith('key.pem')) {
        return testPrivKeyPEM
      }

      return Buffer.from('')
    }),
  },
}))

vi.mock('crypto', async () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue('abcdefgh'),
  },
}))

vi.mock('node:child_process', async () => ({
  spawn: vi.fn(),
}))

suite('health check', () => {
  test('passes if serving', async () => {
    const server = createServer()
    healthCheck.mockResolvedValueOnce({
      response: { status: HealthCheckResponse_ServingStatus.SERVING },
    })

    expect(await server['isRunning']()).toBe(true)
  })

  test('fails if not serving', async () => {
    const server = createServer()
    healthCheck.mockResolvedValueOnce({
      response: { status: HealthCheckResponse_ServingStatus.NOT_SERVING },
    })

    expect(await server['isRunning']()).toBe(false)
  })

  test('fails if error', async () => {
    const server = createServer()
    healthCheck.mockRejectedValueOnce({ code: 'UNAVAILABLE' })

    expect(await server['isRunning']()).toBe(false)
  })
})

suite('Runme server spawn process', () => {
  const configValues: Record<string, any> = {
    binaryPath: 'bin/runme',
  }
  vi.mocked(workspace.getConfiguration).mockReturnValue({
    get: vi.fn().mockImplementation((config: string) => configValues[config]),
  } as any)

  test('proper credentials without tls', async () => {
    configValues.enableTLS = false

    const server = new Server(
      Uri.file('/Users/user/.vscode/extension/stateful.runme'),
      {
        retryOnFailure: true,
        maxNumberOfIntents: 2,
      },
      false,
    )

    const creds = await server['channelCredentials']()
    expect(creds._isSecure()).toBe(false)
  })

  test('proper credentials with tls', async () => {
    configValues.enableTLS = true

    const server = new Server(
      Uri.file('/Users/user/.vscode/extension/stateful.runme'),
      {
        retryOnFailure: true,
        maxNumberOfIntents: 2,
      },
      false,
    )

    const creds = await server['channelCredentials']()
    expect(creds._isSecure()).toBe(true)
  })

  test('uses UDS instead of TCP socket', async () => {
    configValues.transportType = 'UDS'

    const server = new Server(
      Uri.file('/Users/user/.vscode/extension/stateful.runme'),
      {
        retryOnFailure: true,
        maxNumberOfIntents: 2,
      },
      false,
    )

    const address = server['address']()
    expect(address).toStrictEqual('unix:///tmp/runme-abcdefgh.sock')
  })

  test('uses TCP socket by default', async () => {
    configValues.transportType = undefined

    const server = new Server(
      Uri.file('/Users/user/.vscode/extension/stateful.runme'),
      {
        retryOnFailure: true,
        maxNumberOfIntents: 2,
      },
      false,
    )

    const address = server['address']()
    expect(address).toStrictEqual('localhost:7863')
  })

  test('Should try 2 times before failing', async () => {
    configValues.enableTLS = true

    const server = createServer({
      retryOnFailure: true,
      maxNumberOfIntents: 2,
    })

    const serverLaunchSpy = vi.spyOn(server, 'launch')
    await expect(server.launch()).rejects.toBeInstanceOf(RunmeServerError)
    expect(serverLaunchSpy).toBeCalledTimes(3)
  })

  test('Should increment until port is available', async () => {
    configValues.enableTLS = true

    const server = createServer({
      retryOnFailure: true,
      maxNumberOfIntents: 2,
    })

    vi.mocked(fs.access).mockResolvedValueOnce()
    vi.mocked(fs.stat).mockResolvedValueOnce({
      isFile: vi.fn().mockReturnValue(true),
    } as any)

    vi.mocked(isPortAvailable).mockResolvedValueOnce(false)
    const port = server['_port']()
    await expect(server.launch()).rejects.toBeInstanceOf(RunmeServerError)

    expect(server['_port']()).toStrictEqual(port + 1)
  })
})

suite('Runme server accept connections', () => {
  let server: Server
  beforeEach(() => {
    server = createServer({
      retryOnFailure: false,
      maxNumberOfIntents: 2,
      acceptsConnection: {
        intents: 4,
        interval: 50,
      },
    })
  })

  test('Should wait until server accepts connection', async () => {
    server.start = vi.fn().mockResolvedValue('localhost:8080')
    server.isRunning = vi.fn().mockResolvedValue(true)

    await expect(server.launch()).resolves.toBe('localhost:8080')
  })

  test('Should wait throw error when server never accepts connection', async () => {
    server.start = vi.fn().mockResolvedValue('localhost:8080')
    server.isRunning = vi.fn().mockResolvedValue(false)

    await expect(server.launch()).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Server did not accept connections after 0.2s"',
    )
  })
})

function createServer(
  config: IServerConfig = {
    retryOnFailure: true,
    maxNumberOfIntents: 2,
  },
  externalServer = false,
) {
  return new Server(
    Uri.file('/Users/user/.vscode/extension/stateful.runme'),
    config,
    externalServer,
  )
}
