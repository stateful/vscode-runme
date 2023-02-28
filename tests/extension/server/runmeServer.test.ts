import { suite, test, expect, vi, beforeEach } from 'vitest'
import { workspace } from 'vscode'

vi.mock('vscode')
vi.mock('../../../src/extension/grpc/client', () => ({ initParserClient: vi.fn() }))

import Server from '../../../src/extension/server/runmeServer'
import RunmeServerError from '../../../src/extension/server/runmeServerError'

suite('Runme server spawn process', () => {
    beforeEach(() => {
        vi.mock('node:fs/promises', async () => ({
            default: {
                access: vi.fn().mockResolvedValue(false),
                stat: vi.fn().mockResolvedValue({
                    isFile: vi.fn().mockReturnValue(false)
                })
            }
        }))
    })

    const configValues = {
        binaryPath: 'bin/runme'
    }
    vi.mocked(workspace.getConfiguration).mockReturnValue({
        get: vi.fn().mockImplementation((config: string) => configValues[config])
    } as any)

    test('Should try 2 times before failing', async () => {
        const server = new Server(
          '/Users/user/.vscode/extension/stateful.runme',
          {
            retryOnFailure: true,
            maxNumberOfIntents: 2,
          }
        )
        const serverLaunchSpy = vi.spyOn(server, 'launch')
        await expect(server.launch()).rejects.toBeInstanceOf(RunmeServerError)
        expect(serverLaunchSpy).toBeCalledTimes(3)
    })
})

suite('Runme server accept connections', () => {
    let server: Server
    beforeEach(() => {
        server = new Server(
          '/Users/user/.vscode/extension/stateful.runme',
          {
            retryOnFailure: false,
            maxNumberOfIntents: 2,
            acceptsConnection: {
              intents: 4,
              interval: 1,
            }
          }
        )
    })

    test('Should wait until server accepts connection', async () => {
        server.start = vi.fn().mockResolvedValue('localhost:8080')
        server.isRunning = vi.fn().mockResolvedValue(true)

        await expect(
          server.launch()
        ).resolves.toBe('localhost:8080')
    })

    test('Should wait throw error when server never accepts connection', async () => {
        server.start = vi.fn().mockResolvedValue('localhost:8080')
        server.isRunning = vi.fn().mockResolvedValue(false)

        await expect(
          server.launch()
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          '"Server did not accept connections after 5ms"'
        )
    })
})
