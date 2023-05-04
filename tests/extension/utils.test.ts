import vscode, { commands, workspace } from 'vscode'
import { expect, vi, test, beforeEach, beforeAll, afterAll, suite } from 'vitest'

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
} from '../../src/extension/utils'
import { ENV_STORE, DEFAULT_ENV } from '../../src/extension/constants'
import { CellAnnotations } from '../../src/types'

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

vi.mock('vscode', () => ({
  default: {
    window: {
      terminals: [
        { creationOptions: { env: {} } },
        { creationOptions: { env: { RUNME_ID: 'foobar:123' } } }
      ]
    },
    workspace: {
      getConfiguration: vi.fn()
    },
    env: {
      machineId: 'test-machine-id'
    },
  },
  workspace: {
    getConfiguration: vi.fn()
  },
  commands: {
    executeCommand: vi.fn()
  },
}))
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
  expect(getAnnotations({ metadata: { } } as any).interactive).toBe(true)
})

test('getTerminalByCell', () => {
  expect(getTerminalByCell({ document: { fileName: 'foo' }, index: 42} as any))
    .toBe(undefined)
  expect(getTerminalByCell({ document: { fileName: 'foobar' }, index: 123} as any))
    .not.toBe(undefined)
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
    expect(prepareCmdSeq('$ echo hi')).toStrictEqual([ 'echo hi' ])
    expect(prepareCmdSeq('  $  echo hi')).toStrictEqual([ 'echo hi' ])
    expect(prepareCmdSeq('echo 1\necho 2\n $ echo 4')).toStrictEqual(['echo 1', 'echo 2', 'echo 4'])
  })
})

suite('openFileAsRunmeNotebook', () => {
  beforeEach(() => {
    vi.mocked(commands.executeCommand).mockClear()
  })

  test('runs executecommand', async () => {
    const uri = { } as any
    await openFileAsRunmeNotebook(uri)

    expect(commands.executeCommand).toBeCalledTimes(1)
    expect(commands.executeCommand).toBeCalledWith('vscode.openWith', uri, 'runme')
  })
})
