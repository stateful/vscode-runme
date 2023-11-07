import path from 'node:path'

import { suite, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Uri, workspace } from 'vscode'

import {
  getRunmePanelIdentifier,
  getRunmeAppUrl,
  getPortNumber,
  enableServerLogs,
  getBinaryPath,
  getServerConfigurationValue,
  getTLSDir,
  getNotebookTerminalConfigurations,
  getCodeLensEnabled,
  getCLIUseIntegratedRunme,
} from '../../src/utils/configuration'
import { SERVER_PORT } from '../../src/constants'
import { RunmeIdentity } from '../../src/extension/grpc/serializerTypes'

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

const FAKE_UNIX_EXT_PATH = '/Users/user/.vscode/extension/stateful.runme'
const FAKE_WIN_EXT_PATH = 'C:\\Users\\.vscode\\extensions\\stateful.runme'

vi.mock('path', async (origModFactory) => {
  const origMod = await origModFactory<typeof path>()
  const p = {
    ...origMod,
    join: vi.fn(origMod.join),
    isAbsolute: vi.fn(origMod.isAbsolute),
  }
  return { ...p, default: p }
})

vi.mock('vscode', async () => {
  const mocked = await import('../../__mocks__/vscode')
  const SETTINGS_MOCK: {
    port: number | string | undefined
    binaryPath: string | undefined
    enableLogger: string | boolean | undefined
    tlsDir: string | undefined
    baseDomain: string | undefined
    'runme.cloud': string | undefined
  } = {
    port: undefined,
    binaryPath: undefined,
    enableLogger: undefined,
    tlsDir: undefined,
    baseDomain: undefined,
    'runme.cloud': undefined,
  }

  return {
    ...mocked,
    workspace: {
      getConfiguration: vi.fn().mockReturnValue({
        update: (configurationName: string, val: unknown) => {
          SETTINGS_MOCK[configurationName] = val
        },
        get: (configurationName) => {
          return SETTINGS_MOCK[configurationName]
        },
      }),
    },
    Uri: mocked.Uri,
  }
})

vi.mock('vscode-telemetry')

suite('Configuration', () => {
  test('should get nullish from font family', () => {
    expect(getNotebookTerminalConfigurations()).toMatchSnapshot()
    workspace.getConfiguration().update('fontFamily', 'Fira Code')
    expect(getNotebookTerminalConfigurations().fontFamily).toStrictEqual('Fira Code')

    // example fails because "line" is not valid
    workspace.getConfiguration().update('cursorStyle', 'line')
    expect(getNotebookTerminalConfigurations().cursorStyle).toStrictEqual(undefined)

    workspace.getConfiguration().update('cursorStyle', 'underline')
    expect(getNotebookTerminalConfigurations().cursorStyle).toStrictEqual('underline')
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
    workspace.getConfiguration().update('enableLogger', undefined)
    const path = enableServerLogs()
    expect(path).toBeFalsy()
  })

  test('should disable server logs with an invalid string', () => {
    workspace.getConfiguration().update('enableLogger', 'true')
    const path = enableServerLogs()
    expect(path).toBeFalsy()
  })

  test('should get default TLS dir by default', () => {
    workspace.getConfiguration().update('tlsDir', undefined)
    expect(getTLSDir(Uri.file('/ext/base'))).toBe(Uri.file('/ext/base/tls').fsPath)
  })

  test('should get set TLS dir if set', () => {
    workspace.getConfiguration().update('tlsDir', '/tmp/runme/tls')
    expect(getTLSDir(Uri.file('/ext/base'))).toBe('/tmp/runme/tls')
  })

  test('getServerConfigurationValue should default to undefined binaryPath', () => {
    workspace.getConfiguration().update('binaryPath', undefined)

    expect(getServerConfigurationValue<string | undefined>('binaryPath', undefined)).toStrictEqual(
      undefined,
    )
  })

  test('getServerConfigurationValue should give proper binaryPath if defined', () => {
    workspace.getConfiguration().update('binaryPath', '/binary/path')

    expect(getServerConfigurationValue<string | undefined>('binaryPath', undefined)).toStrictEqual(
      '/binary/path',
    )
  })

  test('getServerConfigurationValue should give default persist identity', () => {
    expect(
      getServerConfigurationValue<number>('persistIdentity', RunmeIdentity.UNSPECIFIED),
    ).toStrictEqual(RunmeIdentity.ALL)
  })

  test('getCodeLensEnabled should return true by default', () => {
    expect(getCodeLensEnabled()).toStrictEqual(true)
  })

  test('getCLIUseIntegratedRunme should return false by default', () => {
    expect(getCLIUseIntegratedRunme()).toStrictEqual(false)
  })

  suite('posix', () => {
    beforeEach(() => {
      workspace.getConfiguration().update('binaryPath', undefined)
    })

    afterEach(() => {
      workspace.getConfiguration().update('binaryPath', undefined)
    })

    test('should default to a valid binaryPath', () => {
      const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
      expect(binary.fsPath).toStrictEqual('/Users/user/.vscode/extension/stateful.runme/bin/runme')
    })

    test('should default to a valid relative binaryPath when specified', () => {
      workspace.getConfiguration().update('binaryPath', 'newBin')
      // @ts-expect-error readonly
      workspace.workspaceFolders = [{ uri: Uri.file('/Users/user/Projects/project') }]
      const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
      expect(binary.fsPath).toStrictEqual('/Users/user/Projects/project/newBin')
    })

    test('should default to a valid absolute binaryPath when specified', () => {
      workspace.getConfiguration().update('binaryPath', '/opt/homebrew/bin/runme')
      const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'linux')
      expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
    })

    test('should use runme for non-windows platforms', () => {
      workspace.getConfiguration().update('binaryPath', '/opt/homebrew/bin/runme')
      const binary = getBinaryPath(Uri.file(FAKE_UNIX_EXT_PATH), 'darwin')
      expect(binary.fsPath).toStrictEqual('/opt/homebrew/bin/runme')
    })
  })

  suite('win32', () => {
    beforeEach(() => {
      path.join = vi.fn(path.win32.join)
      path.isAbsolute = vi.fn(path.win32.isAbsolute)
    })

    afterEach(() => {
      vi.mocked(path.join).mockRestore()
      vi.mocked(path.isAbsolute).mockRestore()
    })

    test('should default to a valid binaryPath exe on windows', () => {
      const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
      expect(binary.fsPath).toStrictEqual(
        'c:\\Users\\.vscode\\extensions\\stateful.runme\\bin\\runme.exe',
      )
    })

    test('should use runme.exe for windows platforms with absolute path', () => {
      workspace.getConfiguration().update('binaryPath', 'C:\\custom\\path\\to\\bin\\runme.exe')

      const binary = getBinaryPath(Uri.file(FAKE_WIN_EXT_PATH), 'win32')
      expect(binary.fsPath).toStrictEqual('c:\\custom\\path\\to\\bin\\runme.exe')
    })

    test('should use runme.exe for windows platforms with relative path', () => {
      workspace.getConfiguration().update('binaryPath', 'newBin.exe')
      // @ts-expect-error readonly
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
      workspace.getConfiguration().update('baseDomain', '127.0.0.1')
      const url = getRunmeAppUrl(['api'])
      expect(url).toStrictEqual('http://127.0.0.1:4000/')
    })

    test('should allow app URL with http for localhost', async () => {
      workspace.getConfiguration().update('baseDomain', 'localhost')
      const url = getRunmeAppUrl(['app'])
      expect(url).toStrictEqual('http://localhost:4001/')
    })

    test('should allow app URL with http for localhost without subdomain', async () => {
      workspace.getConfiguration().update('baseDomain', 'localhost')
      const url = getRunmeAppUrl([])
      expect(url).toStrictEqual('http://localhost/')
    })

    test('should allow specific app URL for remote dev returning staging-based domains', async () => {
      workspace.getConfiguration().update('baseDomain', 'http://localhost:4001')
      const app = getRunmeAppUrl(['app'])
      expect(app).toStrictEqual('http://localhost:4001')
      const api = getRunmeAppUrl(['api'])
      expect(api).toStrictEqual('https://api.staging.runme.dev/')
    })
  })

  suite('app panel custom assigment', () => {
    test('should return key value for default', () => {
      const id = getRunmePanelIdentifier('runme.cloud')
      expect(id).toStrictEqual('runme.cloud')
    })

    test('should return respective value for key', () => {
      workspace.getConfiguration().update('runme.cloud', 'runme.another')
      const id = getRunmePanelIdentifier('runme.cloud')
      expect(id).toStrictEqual('runme.another')
    })
  })
})
