import path from 'node:path'

import { suite, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Uri, workspace } from 'vscode'

import {
  getRunmeAppUrl,
  getPortNumber,
  enableServerLogs,
  getBinaryPath,
  getServerConfigurationValue,
  getTLSDir,
  DEFAULT_TLS_DIR,
  getNotebookTerminalFontFamily,
  getNotebookTerminalFontSize,
  getCodeLensEnabled,
  getCLIUseIntegratedRunme
} from '../../src/utils/configuration'
import { SERVER_PORT } from '../../src/constants'

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

const FAKE_UNIX_EXT_PATH = '/Users/user/.vscode/extension/stateful.runme'
const FAKE_WIN_EXT_PATH = 'C:\\Users\\.vscode\\extensions\\stateful.runme'

const SETTINGS_MOCK:
    {
        port: number | string | undefined
        binaryPath: string | undefined
        enableLogger: string | boolean | undefined
        tlsDir: string | undefined
        baseDomain: string | undefined
    } = {
    port: undefined,
    binaryPath: undefined,
    enableLogger: undefined,
    tlsDir: undefined,
    baseDomain: undefined,
}

beforeEach(() => {
  vi.mock('vscode', async () => {
    const mocked = await import('../../__mocks__/vscode')

    return ({
      ...mocked,
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

  vi.mock('vscode-telemetry')

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
    test('should get nullish from font family', () => {
      const fontFamily = getNotebookTerminalFontFamily()
      expect(fontFamily).toBeUndefined()
    })

    test('should get nullish from font size', () => {
      const fontSize = getNotebookTerminalFontSize()
      expect(fontSize).toBeUndefined()
    })

    test('should default to a valid port number', () => {
        const portNumber = getPortNumber()
        expect(portNumber).toStrictEqual(7863)
    })

    test('should use a valid specified port number', () => {
        const portNumber = getPortNumber()
        expect(portNumber).toStrictEqual(SERVER_PORT)
    })

    test('should disable server logs with an invalid value', () => {
      SETTINGS_MOCK.enableLogger = undefined
      const path = enableServerLogs()
      expect(path).toBeFalsy()
    })

    test('should disable server logs with an invalid string', () => {
        SETTINGS_MOCK.enableLogger = 'true'
        const path = enableServerLogs()
        expect(path).toBeFalsy()
    })

    test('should get default TLS dir by default', () => {
      SETTINGS_MOCK.tlsDir = undefined
      expect(getTLSDir()).toBe(DEFAULT_TLS_DIR)
    })

    test('should get set TLS dir if set', () => {
      SETTINGS_MOCK.tlsDir = '/tmp/runme/tls'
      expect(getTLSDir()).toBe('/tmp/runme/tls')
    })

    test('getServerConfigurationValue Should default to undefined binaryPath', () => {
      SETTINGS_MOCK.binaryPath = undefined

      expect(
        getServerConfigurationValue<string | undefined>('binaryPath', undefined)
      ).toStrictEqual(undefined)
    })

    test('getServerConfigurationValue Should give proper binaryPath if defined', () => {
      SETTINGS_MOCK.binaryPath = '/binary/path'

      expect(
        getServerConfigurationValue<string | undefined>('binaryPath', undefined)
      ).toStrictEqual('/binary/path')
    })

    test('getCodeLensEnabled should return true by default', () => {
      expect(
        getCodeLensEnabled()
      ).toStrictEqual(true)
    })

    test('getCLIUseIntegratexRunme should return false by default', () => {
      expect(getCLIUseIntegratedRunme()).toStrictEqual(false)
    })

    suite('posix', () => {
      beforeEach(() => {
        platformPathMocks(path.posix)
      })

      test('should default to a valid binaryPath', () => {
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
          expect(binary.fsPath).toStrictEqual('/Users/user/.vscode/extension/stateful.runme/bin/runme')
      })

      test('should default to a valid relative binaryPath when specified', () => {
          SETTINGS_MOCK.binaryPath = 'newBin'
          // @ts-expect-error
          workspace.workspaceFolders = [{ uri: Uri.file('/Users/user/Projects/project') }]
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
          expect(binary.fsPath).toStrictEqual('/Users/user/Projects/project/newBin')
      })

      test('should default to a valid absolute binaryPath when specified', () => {
        SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin/runme'
        const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
        expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
      })

      test('should use runme for non-windows platforms', () => {
          SETTINGS_MOCK.binaryPath = '/opt/homebrew/bin/runme'
          const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'darwin')
          expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
      })
    })

    suite('win32', () => {
      beforeEach(() => {
        platformPathMocks(path.win32)
      })

      test('should default to a valid binaryPath exe on windows', () => {
        const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win')
        expect(binary.fsPath).toStrictEqual(
          'c:\\Users\\.vscode\\extensions\\stateful.runme\\bin\\runme.exe'
        )
      })

      test('should use runme.exe for windows platforms with absolute path', () => {
        SETTINGS_MOCK.binaryPath = 'C:\\custom\\path\\to\\bin\\runme.exe'

        const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
        expect(binary.fsPath).toStrictEqual('c:\\custom\\path\\to\\bin\\runme.exe')
      })

      test('should use runme.exe for windows platforms with relative path', () => {
          SETTINGS_MOCK.binaryPath = 'newBin.exe'
          // @ts-expect-error
          workspace.workspaceFolders = [{ uri: Uri.file('c:\\Users\\Projects\\project') }]
          const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
          expect(binary.fsPath).toStrictEqual('c:\\Users\\Projects\\project\\newBin.exe')
      })
    })

    suite('app domain resolution', () => {
      test('should return URL for api with subdomain', () => {
        const url = getRunmeAppUrl(['api'])
        expect(url).toStrictEqual('https://api.runme.dev/')
      })

      test('should return URL for api with deep subdomain', () => {
        const url = getRunmeAppUrl(['l4', 'l3', 'api'])
        expect(url).toStrictEqual('https://l4.l3.api.runme.dev/')
      })

      test('should return URL without subdomain', () => {
        const url = getRunmeAppUrl([])
        expect(url).toStrictEqual('https://runme.dev/')
      })

      test('should return URL without subdomain', () => {
        const url = getRunmeAppUrl([])
        expect(url).toStrictEqual('https://runme.dev/')
      })

      test('should allow api URL with http for 127.0.0.1', async () => {
        SETTINGS_MOCK.baseDomain = '127.0.0.1'
        const url = getRunmeAppUrl(['api'])
        expect(url).toStrictEqual('http://127.0.0.1:4000/')
      })

      test('should allow app URL with http for localhost', async () => {
        SETTINGS_MOCK.baseDomain = 'localhost'
        const url = getRunmeAppUrl(['app'])
        expect(url).toStrictEqual('http://localhost:4001/')
      })

      test('should allow app URL with http for localhost without subdomain', async () => {
        SETTINGS_MOCK.baseDomain = 'localhost'
        const url = getRunmeAppUrl([])
        expect(url).toStrictEqual('http://localhost/')
      })
    })
})
