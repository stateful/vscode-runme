import vscode, { ExtensionContext, FileType, Uri, commands, workspace } from 'vscode'
import { expect, vi, test, beforeEach, beforeAll, afterAll, suite } from 'vitest'
import { v4 } from 'uuid'

import {
  getTerminalByCell,
  resetEnv,
  getKey,
  normalizeLanguage,
  getAnnotations,
  mapGitIgnoreToGlobFolders,
  hashDocumentUri,
  getGrpcHost,
  openFileAsRunmeNotebook,
  getWorkspaceFolder,
  getWorkspaceEnvs,
  isGitHubLink,
  isDenoScript,
  validateAnnotations,
  setNotebookCategories,
  getNotebookCategories,
  getNamespacedMid,
  bootFile,
  fileOrDirectoryExists,
  isMultiRootWorkspace,
  convertEnvList,
} from '../../src/extension/utils'
import { ENV_STORE, DEFAULT_ENV } from '../../src/extension/constants'
import { CellAnnotations } from '../../src/types'

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

vi.mock('vscode', async () => {
  const { v4 } = (await vi.importActual('uuid')) as typeof import('uuid')
  const mocked = (await vi.importActual('../../__mocks__/vscode')) as any

  const uuid1 = v4()
  const uuid2 = v4()

  return {
    ...mocked,
    default: {
      window: {
        terminals: [
          {
            creationOptions: { env: { RUNME_ID: uuid1 } },
            name: `echo hello (RUNME_ID: ${uuid1})`,
          },
          { creationOptions: { env: { RUNME_ID: uuid2 } }, name: `echo hi (RUNME_ID: ${uuid2})` },
        ],
      },
      workspace: {
        getConfiguration: vi.fn(),
        workspaceFolders: [],
        fs: mocked.workspace.fs,
      },
      env: {
        machineId: 'test-machine-id',
      },
      NotebookCellKind: {
        Markup: 1,
        Code: 2,
      },
    },
    workspace: {
      getConfiguration: vi.fn().mockReturnValue(new Map()),
      fs: mocked.workspace.fs,
      workspaceFolders: [],
    },
    commands: {
      executeCommand: vi.fn(),
    },
  }
})
vi.mock('vscode-telemetry')

const PATH = process.env.PATH
beforeAll(() => {
  DEFAULT_ENV.PATH = '/usr/bin'
  ENV_STORE.delete('PATH')
})
afterAll(() => {
  process.env.PATH = PATH
})
beforeEach(() => {
  vi.mocked(workspace.getConfiguration).mockClear()
  vi.mocked(commands.executeCommand).mockClear()
})

test('isInteractive', () => {
  expect(getAnnotations({ metadata: { interactive: 'true' } } as any).interactive).toBe(true)
  expect(getAnnotations({ metadata: { interactive: 'false' } } as any).interactive).toBe(false)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(true)
})

test('getTerminalByCell', () => {
  expect(
    getTerminalByCell({
      metadata: { 'runme.dev/uuid': vscode.window.terminals[0].creationOptions['env'].RUNME_ID },
      kind: 2,
    } as any),
  ).toBeTruthy()

  expect(
    getTerminalByCell({
      metadata: { 'runme.dev/uuid': v4() },
      kind: 2,
    } as any),
  ).toBeUndefined()

  expect(
    getTerminalByCell({
      kind: 1,
    } as any),
  ).toBeUndefined()
})

test('resetEnv', () => {
  ENV_STORE.set('foo', 'bar')
  expect(ENV_STORE).toMatchSnapshot()
  resetEnv()
  expect(ENV_STORE).toMatchSnapshot()
})

test('getKey', () => {
  expect(
    getKey({
      getText: vi.fn().mockReturnValue('foobar'),
      languageId: 'barfoo',
    } as any),
  ).toBe('barfoo')

  expect(
    getKey({
      getText: vi.fn().mockReturnValue('deployctl deploy foobar'),
      languageId: 'something else',
    } as any),
  ).toBe('deno')

  expect(
    getKey({
      getText: vi.fn().mockReturnValue(''),
      languageId: 'shellscript',
    } as any),
  ).toBe('sh')
})

suite('normalizeLanguage', () => {
  test('with zsh', () => {
    const lang = normalizeLanguage('zsh')
    expect(lang).toBe('sh')
  })

  test('with shell', () => {
    const lang = normalizeLanguage('shell')
    expect(lang).toBe('sh')
  })

  test('with sh', () => {
    const lang = normalizeLanguage('sh')
    expect(lang).toBe('sh')
  })
})

suite('mapGitIgnoreToGlobFolders', () => {
  test('map properly to glob patterns folders', () => {
    const gitIgnoreContents = `
    # Logs
    report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json
    yarn-error.log
    modules/
    out
    node_modules
    /node_modules
    .vscode-test/
    *.vsix
    wasm
    .DS_Store
    coverage
    .wdio-vscode-service
    examples/fresh/deno.lock
    tests/e2e/logs
    tests/e2e/screenshots
    #Comment
    \#README
    !coverage/config
    abc/**
    a/**/b
    hello.*
    jspm_packages/
    `

    const expectedGlobPatterns = [
      '**/modules/**',
      '**/out/**',
      '**/node_modules/**',
      '**/.vscode-test/**',
      '**/wasm/**',
      '**/.DS_Store**',
      '**/coverage/**',
      '**/.wdio-vscode-service**',
      '**/tests/e2e/logs/**',
      '**/tests/e2e/screenshots/**',
      '**/coverage/config/**',
      '**/abc/**/**',
      '**/a/**/b/**',
      '**/jspm_packages/**',
    ]

    const globPatterns = mapGitIgnoreToGlobFolders(gitIgnoreContents.split('\n'))
    expect(globPatterns).toStrictEqual(expectedGlobPatterns)
  })

  test('should handle empty gitignore file properly', () => {
    const gitIgnoreContents = ''
    const expectedGlobPatterns = []
    const globPatterns = mapGitIgnoreToGlobFolders(gitIgnoreContents.split('\n'))
    expect(globPatterns).toStrictEqual(expectedGlobPatterns)
  })
})

test('salt hash filename', () => {
  const hashed = hashDocumentUri('file:///tmp/test/README.md')
  expect(hashed).toBe('6617e96a-2b29-5457-b824-b161ebe678bc')
})

suite('#getAnnotations', () => {
  test('should have sane defaults', () => {
    const d = getAnnotations({
      name: 'command-123',
      'runme.dev/uuid': '48d86c43-84a4-469d-8c78-963513b0f9d0',
    })
    expect(d).toStrictEqual(<CellAnnotations>{
      background: false,
      closeTerminalOnSuccess: true,
      interactive: true,
      mimeType: 'text/plain',
      name: 'command-123',
      category: '',
      excludeFromRunAll: false,
      promptEnv: true,
      'runme.dev/uuid': '48d86c43-84a4-469d-8c78-963513b0f9d0',
      interpreter: '',
    })
  })

  test('should process cell properly', () => {
    const hello: object = {
      kind: 2,
      value: 'echo "Hello World!"',
      languageId: 'sh',
      metadata: { 'runme.dev/name': 'echo-hello' },
    }

    expect(getAnnotations(hello)).toStrictEqual({
      background: false,
      closeTerminalOnSuccess: true,
      interactive: true,
      mimeType: 'text/plain',
      name: 'echo-hello',
      promptEnv: true,
      excludeFromRunAll: false,
      category: '',
      interpreter: '',
    })
  })
})

suite('#getGrpcHost', () => {
  test('should return host addr including config port', () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({
      get: vi.fn().mockReturnValue(7863),
    } as any)
    expect(getGrpcHost()).toStrictEqual('localhost:7863')
  })
})

suite('openFileAsRunmeNotebook', () => {
  beforeEach(() => {
    vi.mocked(commands.executeCommand).mockClear()
  })

  test('runs executecommand', async () => {
    const uri = {} as any
    await openFileAsRunmeNotebook(uri)

    expect(commands.executeCommand).toBeCalledTimes(1)
    expect(commands.executeCommand).toBeCalledWith('vscode.openWith', uri, 'runme')
  })
})

suite('getWorkspaceFolder', () => {
  beforeEach(() => {
    // @ts-ignore
    workspace.workspaceFolders = []
  })

  test('is empty if no workspace folder', async () => {
    expect(await getWorkspaceEnvs()).toStrictEqual({})
  })

  test('identifies correct workspace', () => {
    const workspaceFolder1 = { uri: Uri.file('/foo/bar') }
    const workspaceFolder2 = { uri: Uri.file('/bar/foo') }
    const workspaceFolder3 = { uri: Uri.file('/bar/baz') }

    // @ts-ignore
    workspace.workspaceFolders = [workspaceFolder1, workspaceFolder2, workspaceFolder3]

    expect(getWorkspaceFolder()).toBe(workspaceFolder1)
    expect(getWorkspaceFolder(Uri.file('/bar/baz/.env'))).toBe(workspaceFolder3)
  })
})

suite('getWorkspaceEnvs', () => {
  beforeEach(() => {
    // @ts-ignore
    workspace.workspaceFolders = []

    vi.mocked(workspace.fs.stat).mockReset()
    vi.mocked(workspace.fs.readFile).mockReset()
  })

  test('identifies env files', async () => {
    const workspaceFolder = { uri: Uri.file('/foo/bar') }

    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    vi.mocked(workspace.fs.readFile).mockImplementation(async (uri) => {
      if (uri.fsPath === '/foo/bar/.env') {
        return Buffer.from('SECRET_1=secret1_override\nSECRET_2=secret2\n')
      } else if (uri.fsPath === '/foo/bar/.env.local') {
        return Buffer.from('SECRET_1=secret1\nSECRET_3=secret3')
      }

      return Buffer.from([])
    })

    // @ts-ignore
    workspace.workspaceFolders = [workspaceFolder]

    expect(await getWorkspaceEnvs(workspaceFolder.uri)).toStrictEqual({
      SECRET_1: 'secret1_override',
      SECRET_2: 'secret2',
      SECRET_3: 'secret3',
    })
  })
})

suite('isGitHubLink', () => {
  test('Only accepts secure (https) links', () => {
    const cell: any = {
      getText: vi
        .fn()
        .mockReturnValue('http://github.com/stateful/vscode-runme/actions/workflows/release.yml'),
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts github.com links', () => {
    const cell: any = {
      getText: vi
        .fn()
        .mockReturnValue('http://gitmango.com/stateful/vscode-runme/actions/workflows/release.yml'),
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts github.com workflow links', () => {
    const cell: any = {
      getText: vi.fn().mockReturnValue('http://github.com/stateful/vscode-runme'),
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts complete github.com workflow links', () => {
    const cell: any = {
      getText: vi.fn().mockReturnValue('http://github.com/stateful/vscode-runme/actions/workflows'),
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Accepts an action workflow link', () => {
    const cell: any = {
      getText: vi
        .fn()
        .mockReturnValue('https://github.com/stateful/vscode-runme/actions/workflows/release.yml'),
    }
    expect(isGitHubLink(cell)).toBe(true)
  })

  test('Accepts a source code action workflow link', () => {
    const cell: any = {
      getText: vi
        .fn()
        .mockReturnValue(
          'https://github.com/stateful/vscode-runme/blob/main/.github/workflows/release.yml',
        ),
    }
    expect(isGitHubLink(cell)).toBe(true)
  })
})

suite('isDenoScript', () => {
  test('Rejects invalid deno command', () => {
    const cell: any = {
      getText: vi.fn().mockReturnValue('deno deploy'),
    }
    expect(isDenoScript(cell)).toBe(false)
  })

  test('Accepts only deno deploy script', () => {
    const cell: any = {
      getText: vi.fn().mockReturnValue('deployctl deploy'),
    }
    expect(isDenoScript(cell)).toBe(true)
  })
})

suite('validateAnnotations', () => {
  test('it should fail for invalid annotations values', () => {
    const cell: any = {
      metadata: {
        background: 'invalid',
        interactive: 'invalid',
        closeTerminalOnSuccess: 'invalid',
        promptEnv: 'invalid',
        mimeType: 'application/',
      },
      document: { uri: { fsPath: '/foo/bar/README.md' } },
    }
    const result = validateAnnotations(cell)
    expect(result.hasErrors).toBe(true)
    expect(result.errors && Object.entries(result.errors).length).toBe(2)
  })

  test('it should pass for valid annotations values', () => {
    const cell: any = {
      metadata: {
        background: false,
        interactive: true,
        closeTerminalOnSuccess: true,
        promptEnv: false,
        mimeType: 'text/plain',
      },
      document: { uri: { fsPath: '/foo/bar/README.md' } },
    }
    const result = validateAnnotations(cell)
    expect(result.hasErrors).toBe(false)
  })
})

suite('setNotebookCategories', () => {
  test('should set notebook categories', async () => {
    const contextMock: ExtensionContext = {
      globalState: {
        get: vi.fn().mockReturnValue({
          notebook1: ['shell scripts', 'node.js examples'],
          notebook2: ['more shell scripts'],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    } as any
    const uriMock = {
      path: 'notebook1',
    } as any

    await setNotebookCategories(
      contextMock,
      uriMock,
      new Set(['shell scripts', 'node.js examples']),
    )
    expect(contextMock.globalState.update).toHaveBeenCalledWith('notebookAvailableCategories', {
      notebook1: ['shell scripts', 'node.js examples'],
      notebook2: ['more shell scripts'],
    })
  })

  test('should set a new categories object when empty', async () => {
    const contextMock: ExtensionContext = {
      globalState: {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue({}),
      },
    } as any
    const uriMock = {
      path: 'notebook1',
    } as any

    await setNotebookCategories(
      contextMock,
      uriMock,
      new Set(['shell scripts', 'node.js examples']),
    )
    expect(contextMock.globalState.update).toHaveBeenCalledWith('notebookAvailableCategories', {
      notebook1: ['shell scripts', 'node.js examples'],
    })
  })
})

suite('getNotebookCategories', () => {
  test('should get notebook categories', async () => {
    const contextMock: ExtensionContext = {
      globalState: {
        get: vi.fn().mockReturnValue({
          notebook1: ['shell scripts', 'node.js examples'],
          notebook2: ['more shell scripts'],
        }),
      },
    } as any
    const uriMock = {
      path: 'notebook1',
    } as any

    const categories = await getNotebookCategories(contextMock, uriMock)
    expect(contextMock.globalState.get).toHaveBeenCalledWith('notebookAvailableCategories')
    expect(categories).toStrictEqual(['shell scripts', 'node.js examples'])
  })

  test('should get empty categories array for non-existent notebook state', async () => {
    const contextMock: ExtensionContext = {
      globalState: {
        get: vi.fn().mockReturnValue({
          notebook1: ['shell scripts', 'node.js examples'],
          notebook2: ['more shell scripts'],
        }),
      },
    } as any
    const uriMock = {
      path: 'notebook3',
    } as any

    const categories = await getNotebookCategories(contextMock, uriMock)
    expect(contextMock.globalState.get).toHaveBeenCalledWith('notebookAvailableCategories')
    expect(categories).toStrictEqual([])
  })
})

test('getNamespacedMid', () => {
  expect(getNamespacedMid('1836968c0b13822b48750c44bbb356d8ae45bebbd8f990c63b2641092a23ba89')).toBe(
    'af4f113b-0bd0-5d95-ac4c-4d354a9cb84a',
  )
})

suite('bootFile', () => {
  const contextMock: ExtensionContext = {
    globalState: {
      update: vi.fn().mockResolvedValue({}),
    },
  } as any

  test('should prefer boot file before settings', async () => {
    await bootFile(contextMock)
    expect(workspace.getConfiguration).toBeCalledTimes(0)
  })

  test('should load file defined in settings', async () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({
      get: () => '/foo/Settings.md',
    } as any)
    vi.mocked(workspace.fs.stat).mockImplementation(async (uri) =>
      uri.path.endsWith('Settings.md') ? true : (Promise.reject(new Error('not existing')) as any),
    )
    await bootFile(contextMock)
    expect(commands.executeCommand).toBeCalledWith(
      'vscode.openWith',
      expect.objectContaining({
        path: '/foo/bar/foo/Settings.md',
      }),
      'runme',
    )
  })
})

suite('fileOrDirectoryExists', () => {
  test('should return false when file does not exists', async () => {
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.Unknown } as any)
    const path = Uri.parse('.vscode-mango')
    const exists = await fileOrDirectoryExists(path)
    expect(exists).toBe(false)
  })

  test('should return true when file does exists', async () => {
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    const path = Uri.parse('.vscode-mango')
    const exists = await fileOrDirectoryExists(path)
    expect(exists).toBe(true)
  })

  test('should return true when directory does exists', async () => {
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.Directory } as any)
    const path = Uri.parse('.vscode-mango')
    const exists = await fileOrDirectoryExists(path)
    expect(exists).toBe(true)
  })
})

suite('isMultiRootWorkspace', () => {
  test('should return true when there are multiple workspace folders', () => {
    // @ts-expect-error
    workspace.workspaceFolders = [
      { uri: Uri.file('/Users/user/Projects/project1') },
      { uri: Uri.file('/Users/user/Projects/project2') },
    ]
    expect(isMultiRootWorkspace()).toStrictEqual(true)
  })

  test('should return false when there is one workspace folder', () => {
    // @ts-expect-error
    workspace.workspaceFolders = [{ uri: Uri.file('/Users/user/Projects/project1') }]
    expect(isMultiRootWorkspace()).toStrictEqual(false)
  })

  test('should return false when workspaceFolders are not defined', () => {
    // @ts-expect-error
    workspace.workspaceFolders = undefined
    expect(isMultiRootWorkspace()).toStrictEqual(false)
  })
})

suite('convertEnvList', () => {
  test('can handle basic example', () => {
    expect(convertEnvList(['a=1', 'b=2', 'c=3\n4'])).toStrictEqual({
      a: '1',
      b: '2',
      c: '3\n4',
    })
  })
})
