import { suite, test, expect, vi, beforeEach } from 'vitest'
import { workspace } from 'vscode'

vi.mock('vscode')
vi.mock('../../../src/extension/grpc/client', () => ({ initParserClient: vi.fn() }))

import Server from '../../../src/extension/server/runmeServer'
import RunmeServerError from '../../../src/extension/server/runmeServerError'

suite('Runme server', () => {
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
        const server = new Server({
            retryOnFailure: true,
            maxNumberOfIntents: 2
        })
        const serverLaunchSpy = vi.spyOn(server, 'launch')
        await expect(server.launch()).rejects.toBeInstanceOf(RunmeServerError)
        expect(serverLaunchSpy).toBeCalledTimes(3)
    })
})
