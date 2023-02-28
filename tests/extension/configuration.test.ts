import { suite, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { getPath, getPortNumber, enableServerLogs, getBinaryLocation } from '../../src/utils/configuration'

const FAKE_UNIX_EXT_PATH = '/Users/user/.vscode/extension/stateful.runme'
const FAKE_WIN_EXT_PATH = 'C:\\Users\\.vscode\\extensions\\stateful.runme'

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
        const path = getPath(FAKE_UNIX_EXT_PATH, 'darwin')
        expect(path).toStrictEqual('/Users/user/.vscode/extension/stateful.runme/bin')
    })

    test('Should default to a valid relative binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = 'newBin'
        const path = getPath(FAKE_UNIX_EXT_PATH, 'darwin')
        expect(path).toStrictEqual('/Users/user/.vscode/extension/stateful.runme/newBin')
    })

    test('Should default to a valid absolute binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin'
        const path = getPath(FAKE_UNIX_EXT_PATH, 'darwin')
        expect(path).toStrictEqual('/opt/homebrew/bin')
    })

    test('Should use runme for non-windows platforms', () => {
        SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin'
        const path = getPath(FAKE_UNIX_EXT_PATH, 'darwin')
        const binLoc = getBinaryLocation(path, 'darwin')
        expect(binLoc).toStrictEqual('/opt/homebrew/bin/runme')
    })

    test('Should use runme.exe for windows platforms with absolute path', () => {
        SETTINGS_MOCK.binaryPath = 'C:\\Users\\.vscode\\extensions\\stateful.runme\\bin'
        const path = getPath(FAKE_WIN_EXT_PATH, 'win32')
        const binLoc = getBinaryLocation(path, 'win32')
        expect(binLoc).toStrictEqual('C:\\Users\\.vscode\\extensions\\stateful.runme\\bin\\runme.exe')
    })

    test('Should use runme.exe for windows platforms with relative path', () => {
        SETTINGS_MOCK.binaryPath = 'newBin'
        const path = getPath(FAKE_WIN_EXT_PATH, 'win32')
        const binLoc = getBinaryLocation(path, 'win32')
        expect(binLoc).toStrictEqual('C:\\Users\\.vscode\\extensions\\stateful.runme\\newBin\\runme.exe')
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
