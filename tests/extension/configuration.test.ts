import path from 'node:path'

import { suite, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Uri, workspace } from 'vscode'

import { getPortNumber, enableServerLogs, getBinaryPath } from '../../src/utils/configuration'

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
  vi.mock('vscode', async () => {
    const mocked = await import('../../__mocks__/vscode')

    return ({
      workspace: {
        getConfiguration: vi.fn().mockReturnValue({
          get: (configurationName) => {
            return SETTINGS_MOCK[configurationName]
          }
        }),
      },
      Uri: mocked.Uri,
    })
  })


  vi.mock('node:path', async () => {
    const p = await vi.importActual('node:path') as typeof import('node:path')

    const pathMock = {
      win32: p.win32,
      posix: p.posix,
    }

    mockedPathMethods().forEach(m => pathMock[m] = vi.fn(p[m] as any))

    return ({
      ...pathMock,
      default: pathMock,
    })
  })
})

function mockedPathMethods() {
  return ['join', 'isAbsolute'] as const
}

function platformPathMocks(platform: path.PlatformPath) {
  mockedPathMethods().forEach(m => vi.mocked(path[m]).mockImplementation(platform[m] as any))
}

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

    suite('posix', () => {
      beforeEach(() => {
        platformPathMocks(path.posix)
      })

      test('Should default to a valid binaryPath', () => {
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
          expect(binary.fsPath).toStrictEqual('/Users/user/.vscode/extension/stateful.runme/bin/runme')
      })

      test('Should default to a valid relative binaryPath when specified', () => {
          SETTINGS_MOCK.binaryPath = 'newBin'
          // @ts-expect-error
          workspace.workspaceFolders = [{ uri: Uri.file('/Users/user/Projects/project') }]
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
          expect(binary.fsPath).toStrictEqual('/Users/user/Projects/project/newBin')
      })

      test('Should default to a valid absolute binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin/runme'
        const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
        expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
      })

      test('Should use runme for non-windows platforms', () => {
          SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin/runme'
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'darwin')
          expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
      })
    })

    suite('win32', () => {
      beforeEach(() => {
        platformPathMocks(path.win32)
      })

      test('Should default to a valid binaryPath exe on windows', () => {
        const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win')
        expect(binary.fsPath).toStrictEqual(
          'c:\\Users\\.vscode\\extensions\\stateful.runme\\bin\\runme.exe'
        )
      })

      test('Should use runme.exe for windows platforms with absolute path', () => {
        SETTINGS_MOCK.binaryPath = 'C:\\custom\\path\\to\\bin\\runme.exe'

        const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
        expect(binary.fsPath).toStrictEqual('c:\\custom\\path\\to\\bin\\runme.exe')
      })

      test('Should use runme.exe for windows platforms with relative path', () => {
          SETTINGS_MOCK.binaryPath = 'newBin.exe'
          // @ts-expect-error
          workspace.workspaceFolders = [{ uri: Uri.file('c:\\Users\\Projects\\project') }]
          const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
          expect(binary.fsPath).toStrictEqual('c:\\Users\\Projects\\project\\newBin.exe')
      })
    })
})
