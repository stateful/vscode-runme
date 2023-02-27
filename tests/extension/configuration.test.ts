import { suite, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { getPath, getPortNumber, enableServerLogs } from '../../src/utils/configuration'

const MOCK_EXT_FSPATH = '/User/user/.vscode/extension/stateful.runme'

const SETTINGS_MOCK:
    {
        port: number | string | undefined
        binaryPath: string | undefined
        enableLogger: string | boolean | undefined
    } = {
    port: undefined,
    binaryPath: undefined,
    enableLogger: undefined
}

beforeEach(() => {
    vi.mock('vscode', () => ({
        workspace: {
            getConfiguration: vi.fn().mockReturnValue({
                get: (configurationName) => {
                    return SETTINGS_MOCK[configurationName]
                }
            })
        }
    }))
})

afterEach(() => {
    Object.keys(SETTINGS_MOCK).forEach(key => {
        SETTINGS_MOCK[key] = undefined
    })
})

vi.mock('node:path', async () => {
  return {
    join: vi.fn().mockImplementation((...args: any) => {
      return args[args.length-1]
    }),
  }
})

suite('Configuration', () => {
    test('Should default to a valid port number', () => {
        const portNumber = getPortNumber()
        expect(portNumber).toStrictEqual(7863)
    })

    test('Should use a valid specified port number', () => {
        SETTINGS_MOCK.port = 8080
        const portNumber = getPortNumber()
        expect(portNumber).toStrictEqual(8080)
    })


    test('Should default to a valid binaryPath', () => {
        const path = getPath(MOCK_EXT_FSPATH)
        expect(path).toStrictEqual('bin')
    })

    test('Should default to a valid relative binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = 'bin'
        const path = getPath(MOCK_EXT_FSPATH)
        expect(path).toStrictEqual('bin')
    })

    test('Should default to a valid absolute binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin'
        const path = getPath(MOCK_EXT_FSPATH)
        expect(path).toStrictEqual('/opt/homebrew/bin')
    })

    test('Should disable server logs with an invalid value', () => {
        SETTINGS_MOCK.enableLogger = undefined
        const path = enableServerLogs()
        expect(path).toBeFalsy()
    })

    test('Should disable server logs with an invalid string', () => {
        SETTINGS_MOCK.enableLogger = 'true'
        const path = enableServerLogs()
        expect(path).toBeFalsy()
    })
})
