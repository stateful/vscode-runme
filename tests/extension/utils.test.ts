import vscode, { FileType, Uri, commands, workspace } from 'vscode'
import { expect, vi, test, beforeEach, beforeAll, afterAll, suite } from 'vitest'
import { v4 } from 'uuid'

import {
  getTerminalByCell,
  resetEnv,
  getKey,
  getCmdShellSeq,
  normalizeLanguage,
  canEditFile,
  getAnnotations,
  mapGitIgnoreToGlobFolders,
  hashDocumentUri,
  getGrpcHost,
  prepareCmdSeq,
  openFileAsRunmeNotebook,
  getWorkspaceFolder,
  getWorkspaceEnvs,
  isGitHubLink,
  isDenoScript,
  getCmdSeq,
  validateAnnotations
} from '../../src/extension/utils'
import { ENV_STORE, DEFAULT_ENV } from '../../src/extension/constants'
import { CellAnnotations } from '../../src/types'

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

vi.mock('vscode', async () => {
  const { v4 } = await vi.importActual('uuid') as typeof import('uuid')
  const mocked = await vi.importActual('../../__mocks__/vscode') as any

  const uuid1 = v4()
  const uuid2 = v4()

  return ({
    ...mocked,
    default: {
      window: {
        terminals: [
          { creationOptions: { env: { RUNME_ID: uuid1 } }, name: `echo hello (RUNME_ID: ${uuid1})` },
          { creationOptions: { env: { RUNME_ID: uuid2 } }, name: `echo hi (RUNME_ID: ${uuid2})` }
        ]
      },
      workspace: {
        getConfiguration: vi.fn(),
        workspaceFolders: [],
        fs: mocked.workspace.fs,
      },
      env: {
        machineId: 'test-machine-id'
      },
      NotebookCellKind: {
        Markup: 1,
        Code: 2,
      }
    },
    workspace: {
      getConfiguration: vi.fn(),
      fs: mocked.workspace.fs,
      workspaceFolders: [],
    },
    commands: {
      executeCommand: vi.fn()
    },
  })
})
vi.mock('vscode-telemetry')

const PATH = process.env.PATH
beforeAll(() => {
  DEFAULT_ENV.PATH = '/usr/bin'
  ENV_STORE.delete('PATH')
})
afterAll(() => { process.env.PATH = PATH })

test('isInteractive', () => {
  expect(getAnnotations({ metadata: { interactive: 'true' } } as any).interactive).toBe(true)
  expect(getAnnotations({ metadata: { interactive: 'false' } } as any).interactive).toBe(false)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(true)
})

test('getTerminalByCell', () => {
  expect(getTerminalByCell({
    metadata: { 'runme.dev/uuid': vscode.window.terminals[0].creationOptions['env'].RUNME_ID },
    kind: 2,
  } as any))
    .toBeTruthy()

  expect(getTerminalByCell({
    metadata: { 'runme.dev/uuid': v4() },
    kind: 2,
  } as any))
    .toBeUndefined()
})

test('resetEnv', () => {
  ENV_STORE.set('foo', 'bar')
  expect(ENV_STORE).toMatchSnapshot()
  resetEnv()
  expect(ENV_STORE).toMatchSnapshot()
})

test('getKey', () => {
  expect(getKey({
    getText: vi.fn().mockReturnValue('foobar'),
    languageId: 'barfoo'
  } as any)).toBe('barfoo')
  expect(getKey({
    getText: vi.fn().mockReturnValue('deployctl deploy foobar'),
    languageId: 'something else'
  } as any)).toBe('deno')
})

suite('getCmdShellSeq', () => {
  test('one command', () => {
    const cellText = 'deno task start'
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('wrapped command', () => {
    // eslint-disable-next-line max-len
    const cellText = Buffer.from('ZGVubyBpbnN0YWxsIFwKICAgICAgLS1hbGxvdy1yZWFkIC0tYWxsb3ctd3JpdGUgXAogICAgICAtLWFsbG93LWVudiAtLWFsbG93LW5ldCAtLWFsbG93LXJ1biBcCiAgICAgIC0tbm8tY2hlY2sgXAogICAgICAtciAtZiBodHRwczovL2Rlbm8ubGFuZC94L2RlcGxveS9kZXBsb3ljdGwudHMK', 'base64').toString('utf-8')

    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('env only', () => {
    const cellText = `export DENO_INSTALL="$HOME/.deno"
      export PATH="$DENO_INSTALL/bin:$PATH"
    `
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('complex wrapped', () => {
    // eslint-disable-next-line max-len
    const cellText = 'curl "https://api-us-west-2.graphcms.com/v2/cksds5im94b3w01xq4hfka1r4/master?query=$(deno run -A query.ts)" --compressed 2>/dev/null \\\n| jq -r \'.[].posts[] | "\(.title) - by \(.authors[0].name), id: \(.id)"\''
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('linux without pipefail', () => {
    const cellText = 'ls ~/'
    expect(getCmdShellSeq(cellText, 'linux')).toMatchSnapshot()
  })

  test('windows without shell flags', () => {
    const cellText = 'ls ~/'
    expect(getCmdShellSeq(cellText, 'win32')).toMatchSnapshot()
  })

  test('with comments', () => {
    // eslint-disable-next-line max-len
    const cellText = 'echo "Install deno via installer script"\n# macOS or Linux\ncurl -fsSL https://deno.land/x/install/install.sh | sh'
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('trailing comment', () => {
    const cellText = 'cd ..\nls / # list dir contents\ncd ..\nls /'
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })

  test('leading prompts', () => {
    const cellText = '$ docker build -t runme/demo .\n$ docker ps -qa'
    expect(getCmdShellSeq(cellText, 'darwin')).toMatchSnapshot()
  })
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

suite('canEditFile', () => {
  const verifyCheckedInFile = vi.fn().mockResolvedValue(false)
  const notebook: any = {
    isUntitled: false,
    notebookType: 'runme',
    uri: { fsPath: '/foo/bar' }
  }

  beforeEach(() => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn().mockReturnValue(false)
    } as any)
  })

  test('can not edit by default', async () => {
    expect(await canEditFile(notebook, verifyCheckedInFile)).toBe(false)
  })

  test('can edit if ignore flag is enabled', async () => {
    const notebookMock: any = JSON.parse(JSON.stringify(notebook))
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn().mockReturnValue(true)
    } as any)
    expect(await canEditFile(notebookMock, verifyCheckedInFile)).toBe(true)
  })

  test('can edit file if new', async () => {
    const notebookMock: any = JSON.parse(JSON.stringify(notebook))
    notebookMock.isUntitled = true
    expect(await canEditFile(notebookMock, verifyCheckedInFile)).toBe(true)
  })

  test('can edit file if checked in', async () => {
    const notebookMock: any = JSON.parse(JSON.stringify(notebook))
    verifyCheckedInFile.mockResolvedValue(true)
    expect(await canEditFile(notebookMock, verifyCheckedInFile)).toBe(true)
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
      '**/coverage/**',
      '**/tests/e2e/logs/**',
      '**/tests/e2e/screenshots/**',
      '**/coverage/config/**',
      '**/abc/**/**',
      '**/a/**/b/**',
      '**/jspm_packages/**'
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
    const d = getAnnotations({ name: 'command-123', 'runme.dev/uuid': '48d86c43-84a4-469d-8c78-963513b0f9d0' })
    expect(d).toStrictEqual(
      <CellAnnotations>{
        background: false,
        closeTerminalOnSuccess: true,
        interactive: true,
        mimeType: 'text/plain',
        name: 'command-123',
        promptEnv: true,
        'runme.dev/uuid': '48d86c43-84a4-469d-8c78-963513b0f9d0'
      }
    )
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
    })
  })
})

suite('#getGrpcHost', () => {
  test('should return host addr including config port', () => {
    vi.mocked(workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(7863) } as any)
    expect(getGrpcHost()).toStrictEqual('localhost:7863')
  })
})

suite('prepareCmdSeq', () => {
  test('should eliminate trailing dollar signs', () => {
    expect(prepareCmdSeq('$ echo hi')).toStrictEqual(['echo hi'])
    expect(prepareCmdSeq('  $  echo hi')).toStrictEqual(['echo hi'])
    expect(prepareCmdSeq('echo 1\necho 2\n $ echo 4')).toStrictEqual(['echo 1', 'echo 2', 'echo 4'])
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
    workspace.workspaceFolders = [
      workspaceFolder1,
      workspaceFolder2,
      workspaceFolder3,
    ]

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
    workspace.workspaceFolders = [
      workspaceFolder,
    ]

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
      getText: vi.fn()
        .mockReturnValue('http://github.com/stateful/vscode-runme/actions/workflows/release.yml')
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts github.com links', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('http://gitmango.com/stateful/vscode-runme/actions/workflows/release.yml')
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts github.com workflow links', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('http://github.com/stateful/vscode-runme')
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Only accepts complete github.com workflow links', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('http://github.com/stateful/vscode-runme/actions/workflows')
    }
    expect(isGitHubLink(cell)).toBe(false)
  })

  test('Accepts an action workflow link', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('https://github.com/stateful/vscode-runme/actions/workflows/release.yml')
    }
    expect(isGitHubLink(cell)).toBe(true)
  })

  test('Accepts a source code action workflow link', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('https://github.com/stateful/vscode-runme/blob/main/.github/workflows/release.yml')
    }
    expect(isGitHubLink(cell)).toBe(true)
  })

})


suite('isDenoScript', () => {
  test('Rejects invalid deno command', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('deno deploy')
    }
    expect(isDenoScript(cell)).toBe(false)
  })

  test('Accepts only deno deploy script', () => {
    const cell: any = {
      getText: vi.fn()
        .mockReturnValue('deployctl deploy')
    }
    expect(isDenoScript(cell)).toBe(true)
  })
})

suite('getCmdSeq', () => {
  test('Rejects invalid deno command', () => {
    const cellText = `export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
  `
    const result = getCmdSeq(cellText)
    expect(result).toStrictEqual(['export DENO_INSTALL="$HOME/.deno"', 'export PATH="$DENO_INSTALL/bin:$PATH"'])
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
        mimeType: 'application/'
      },
      document: { uri: { fsPath: '/foo/bar/README.md' } }
    }
    const result = validateAnnotations(cell)
    expect(result.hasErrors).toBe(true)
    expect(result.errors && Object.entries(result.errors).length).toBe(5)
  })

  test('it should pass for valid annotations values', () => {
    const cell: any = {
      metadata: {
        background: false,
        interactive: true,
        closeTerminalOnSuccess: true,
        promptEnv: false,
        mimeType: 'text/plain'
      },
      document: { uri: { fsPath: '/foo/bar/README.md' } }
    }
    const result = validateAnnotations(cell)
    expect(result.hasErrors).toBe(false)
  })
})
