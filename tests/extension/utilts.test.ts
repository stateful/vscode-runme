import vscode from 'vscode'
import { expect, vi, test, beforeEach, beforeAll, afterAll, suite } from 'vitest'

import {
  getTerminalByCell,
  resetEnv,
  getKey,
  getCmdShellSeq,
  normalizeLanguage,
  canEditFile,
  getAnnotations,
  DisposableRegistrar,
} from '../../src/extension/utils'
import { ENV_STORE, DEFAULT_ENV } from '../../src/extension/constants'

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
    }
  }
}))

const PATH = process.env.PATH
beforeAll(() => {
  DEFAULT_ENV.PATH = '/usr/bin'
  ENV_STORE.delete('PATH')
})
afterAll(() => { process.env.PATH = PATH })

test('isInteractive', () => {
  // when set to false in configutaration
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(false) } as any)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(false)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(false)
  expect(getAnnotations({ metadata: { interactive: 'true' } } as any).interactive).toBe(true)

  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(true) } as any)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(true)
  expect(getAnnotations({ metadata: {} } as any).interactive).toBe(true)
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

suite('DisposableRegistrar', () => {
  test('disposes all disposables', () => {
    const disposable1 = { dispose: vi.fn() }
    const disposable2 = { dispose: vi.fn() }
    const disposable3 = { dispose: vi.fn() }
    
    class Registrar extends DisposableRegistrar { 
      constructor() {
        super()
  
        this._register(disposable1)
        this._register(disposable2)
        this._register(disposable3)
      }
    }
  
    const registrar = new Registrar()
  
    registrar.dispose()
  
    expect(disposable1.dispose).toBeCalledTimes(1)
    expect(disposable1.dispose).toBeCalledWith()
    expect(disposable2.dispose).toBeCalledTimes(1)
    expect(disposable2.dispose).toBeCalledTimes(1)
    expect(disposable3.dispose).toBeCalledWith()
    expect(disposable3.dispose).toBeCalledWith()
  })

  test('disposes if already disposed', () => {
    class Registrar extends DisposableRegistrar {
      public register(disposable: vscode.Disposable) {
        this._register(disposable)
      }
    }

    const registrar = new Registrar()
    registrar.dispose()

    const disposable = { dispose: vi.fn() }
    registrar.register(disposable)

    expect(disposable.dispose).toBeCalledTimes(1)
  })

  test('throws single error if only one disposable error', () => {
    const err = new Error()
    const disposable1 = { dispose: () => { throw err } }
    const disposable2 = { dispose: vi.fn() }

    class Registrar extends DisposableRegistrar { 
      constructor() {
        super()

        this._register(disposable1)
        this._register(disposable2)
      }
    }
    const registrar = new Registrar()

    expect(() => registrar.dispose()).toThrowError(err)
    expect(disposable2.dispose).toBeCalledTimes(1)
  })

  test('throws aggregate error if multiple disposable errors', () => {
    const err1 = new Error()
    const disposable1 = { dispose: () => { throw err1 } }
    const err2 = new Error()
    const disposable2 = { dispose: () => { throw err2 } }

    class Registrar extends DisposableRegistrar { 
      constructor() {
        super()

        this._register(disposable1)
        this._register(disposable2)
      }
    }
    const registrar = new Registrar()

    try {
      registrar.dispose()
      throw new Error('Should not get here')
    } catch(e) {
      const { errors } = e as { errors: any[] }
      
      expect(errors).toHaveLength(2)
      expect(errors[0]).toStrictEqual(err1)
      expect(errors[1]).toStrictEqual(err2)
    }
  })
})