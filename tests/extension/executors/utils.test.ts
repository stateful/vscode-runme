import url from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

import { window, Uri } from 'vscode'
import { expect, vi, test, suite, beforeEach } from 'vitest'

import { ENV_STORE } from '../../../src/extension/constants'
import {
  retrieveShellCommand,
  parseCommandSeq,
  getCellShellPath,
  getSystemShellPath,
  getCellCwd,
  isShellLanguage,
} from '../../../src/extension/executors/utils'
import { getCmdSeq, getWorkspaceFolder, getAnnotations } from '../../../src/extension/utils'
import { getCellProgram } from '../../../src/extension/executors/utils'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

vi.mock('vscode-telemetry', () => ({}))

vi.mock('vscode')

vi.mock('../../../src/extension/utils', () => ({
  replaceOutput: vi.fn(),
  // TODO: this should use importActual
  getCmdSeq: vi.fn((cellText: string) =>
    cellText
      .trim()
      .split('\n')
      .filter((x) => x),
  ),
  getWorkspaceFolder: vi.fn(),
  getAnnotations: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  default: {
    stat: vi.fn(),
  },
}))

const COMMAND_MODE_INLINE_SHELL = 1
const COMMAND_MODE_TEMP_FILE = 2

vi.mock('../../../src/extension/grpc/runnerTypes', () => ({
  CommandMode: {
    INLINE_SHELL: 1,
    TEMP_FILE: 2,
  },
}))

beforeEach(() => {
  vi.mocked(window.showInputBox).mockClear()
  vi.mocked(window.showErrorMessage).mockClear()
})

test('should support export without quotes', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: 'export foo=bar' },
      document: {
        getText: vi.fn().mockReturnValue('export foo=bar'),
        uri: { fsPath: __dirname },
      },
    },
  }
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe(undefined)
})

test('should populate value if quotes are used', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: 'export foo="bar"' },
      document: {
        getText: vi.fn().mockReturnValue('export foo="bar"'),
        uri: { fsPath: __dirname },
      },
    },
  }
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe('bar')
})

test('can support single quotes', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: "export foo='bar'" },
      document: {
        getText: vi.fn().mockReturnValue("export foo='bar'"),
        uri: { fsPath: __dirname },
      },
    },
  }
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe('bar')
})

test('can handle new lines before and after', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: '\n\nexport foo=bar\n' },
      document: {
        getText: vi.fn().mockReturnValue('\n\nexport foo=bar\n'),
        uri: { fsPath: __dirname },
      },
    },
  }
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('\n')
})

test('can populate pre-existing envs', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: 'export foo="foo$BARloo"' },
      document: {
        getText: vi.fn().mockReturnValue('export foo="foo$BARloo"'),
        uri: { fsPath: __dirname },
      },
    },
  }
  process.env.BAR = 'rab'
  vi.mocked(window.showInputBox).mockResolvedValue('foo$BAR')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('foorab')
})

test('can support expressions', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: 'export foo=$(echo "foo$BAR")' },
      document: {
        getText: vi.fn().mockReturnValue('export foo=$(echo "foo$BAR")'),
        uri: { fsPath: __dirname },
      },
    },
  }
  process.env.BAR = 'bar'
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('foobar')
})

test('can recall previous vars', async () => {
  const exec1: any = {
    cell: {
      metadata: { executeableCode: 'export foo=$(echo "foo$BAR")' },
      document: {
        getText: vi.fn().mockReturnValue('export foo=$(echo "foo$BAR")'),
        uri: { fsPath: __dirname },
      },
    },
  }
  process.env.BAR = 'bar'
  const cellText1 = await retrieveShellCommand(exec1)
  expect(cellText1).toBe('')
  expect(ENV_STORE.get('foo')).toBe('foobar')
  const exec2: any = {
    cell: {
      metadata: { executeableCode: 'export barfoo=$(echo "bar$foo")' },
      document: {
        getText: vi.fn().mockReturnValue('export barfoo=$(echo "bar$foo")'),
        uri: { fsPath: __dirname },
      },
    },
  }
  const cellText2 = await retrieveShellCommand(exec2)
  expect(cellText2).toBe('')
  expect(ENV_STORE.get('barfoo')).toBe('barfoobar')
})

test('returns undefined if expression fails', async () => {
  const exec: any = {
    cell: {
      metadata: { executeableCode: 'export foo=$(FAIL)' },
      document: {
        getText: vi.fn().mockReturnValue('export foo=$(FAIL)'),
        uri: { fsPath: __dirname },
      },
    },
  }
  expect(await retrieveShellCommand(exec)).toBeUndefined()
  expect(window.showErrorMessage).toBeCalledTimes(1)
})

test('supports multiline exports', async () => {
  const exec: any = {
    cell: {
      metadata: {
        executeableCode:
          'export bar=foo\nexport foo="some\nmultiline\nexport"\nexport foobar="barfoo"',
      },
      document: {
        getText: vi
          .fn()
          .mockReturnValue(
            'export bar=foo\nexport foo="some\nmultiline\nexport"\nexport foobar="barfoo"',
          ),
        uri: { fsPath: __dirname },
      },
    },
  }
  vi.mocked(window.showInputBox).mockImplementation(
    ({ value, placeHolder }: any) => value || placeHolder,
  )
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('bar')).toBe('foo')
  expect(ENV_STORE.get('foo')).toBe('some\nmultiline\nexport')
  expect(ENV_STORE.get('foobar')).toBe('barfoo')
  expect(window.showInputBox).toBeCalledTimes(2)
})

suite('parseCommandSeq', () => {
  beforeEach(() => {
    vi.mocked(window.showInputBox).mockReset()
  })

  test('single-line export', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const res = await parseCommandSeq(['export TEST="<placeholder>"'].join('\n'))

    expect(res).toBeTruthy()
    expect(res).toHaveLength(1)
    expect(res?.[0]).toBe('export TEST="test value"')
  })

  test('single-line export with prompt disabled', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const res = await parseCommandSeq(['export TEST="placeholder"'].join('\n'), false)

    expect(window.showInputBox).toBeCalledTimes(0)

    expect(res).toBeTruthy()
    expect(res).toHaveLength(1)
    expect(res![0]).toBe('export TEST="placeholder"')
  })

  test('single line export with cancelled prompt', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => undefined)

    const res = await parseCommandSeq(['export TEST="<placeholder>"'].join('\n'))

    expect(res).toBe(undefined)
  })

  test('multiline export', async () => {
    const exportLines = ['export TEST="I', 'am', 'doing', 'well!"']

    const res = await parseCommandSeq(exportLines.join('\n'))

    expect(res).toBeTruthy
    expect(res).toHaveLength(4)
    expect(res).toStrictEqual(exportLines)
  })

  test('exports between normal command sequences', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const cmdLines = [
      'echo "Hello!"',
      'echo "Hi!"',
      'export TEST="<placeholder>"',
      'echo $TEST',
      'export TEST_MULTILINE="This',
      'is',
      'a',
      'multiline',
      'env!"',
      'echo $TEST_MULTILINE',
    ]

    const res = await parseCommandSeq(cmdLines.join('\n'))

    expect(res).toBeTruthy()
    expect(res).toStrictEqual([
      'echo "Hello!"',
      'echo "Hi!"',
      'export TEST="test value"',
      '',
      'echo $TEST',
      ...['export TEST_MULTILINE="This', 'is', 'a', 'multiline', 'env!"'],
      'echo $TEST_MULTILINE',
    ])
  })

  test('exports between normal command sequences with getCmdSeq', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const cmdLines = [
      'echo "Hello!"',
      'echo "Hi!"',
      'export TEST="<placeholder>"',
      'echo $TEST',
      'export TEST_MULTILINE="This',
      'is',
      'a',
      'multiline',
      'env!"',
      'echo $TEST_MULTILINE',
    ]

    const res = await parseCommandSeq(cmdLines.join('\n'), true, undefined, getCmdSeq)

    expect(res).toBeTruthy()
    expect(res).toStrictEqual([
      'echo "Hello!"',
      'echo "Hi!"',
      'export TEST="test value"',
      'echo $TEST',
      ...['export TEST_MULTILINE="This', 'is', 'a', 'multiline', 'env!"'],
      'echo $TEST_MULTILINE',
    ])
  })
})

suite('getCellShellPath', () => {
  test('respects frontmatter', () => {
    const shellPath = getCellShellPath(
      {} as any,
      {
        metadata: { 'runme.dev/frontmatterParsed': { shell: 'fish' } },
      } as any,
    )
    expect(shellPath).toStrictEqual('fish')
  })

  test('fallback to system shell', () => {
    const shellPath = getCellShellPath({} as any, {} as any)
    expect(shellPath).toStrictEqual(getSystemShellPath())
  })
})

suite('isShellLanguage', () => {
  test('usual suspects', () => {
    for (const shell of [
      'bash',
      'sh',
      'fish',
      'ksh',
      'zsh',
      'shell',
      'bat',
      'cmd',
      'powershell',
      'pwsh',
    ]) {
      expect(isShellLanguage(shell)).toBeTruthy()
    }
  })
})

suite('getCellProgram', () => {
  test('is inline shell for shell types', async () => {
    for (const shell of [
      'bash',
      'sh',
      'fish',
      'ksh',
      'zsh',
      'shell',
      'bat',
      'cmd',
      'powershell',
      'pwsh',
    ]) {
      vi.mocked(getAnnotations).mockReturnValueOnce({} as any)

      let shellPath = getSystemShellPath()
      if (!shellPath) {
        console.warn(
          `SHELL env not set likely due to non-interactive execution, using ${shell} as default`,
        )
        shellPath = getSystemShellPath(shell)
      }

      expect(getCellProgram({ metadata: {} } as any, {} as any, shell)).toStrictEqual({
        commandMode: COMMAND_MODE_INLINE_SHELL,
        programName: shellPath,
      })
    }
  })

  test('is temp file for non-shell types', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({} as any)

    expect(getCellProgram({ metadata: {} } as any, {} as any, 'python')).toStrictEqual({
      commandMode: COMMAND_MODE_TEMP_FILE,
      programName: '',
    })
  })

  test('respects custom interpreter in shell mode', async () => {
    vi.mocked(getAnnotations).mockImplementationOnce(((x: any) => ({
      interpreter: x.interpreter,
    })) as any)

    expect(
      getCellProgram({ metadata: { interpreter: 'fish' } } as any, {} as any, 'sh'),
    ).toStrictEqual({
      commandMode: COMMAND_MODE_INLINE_SHELL,
      programName: 'fish',
    })
  })

  test('respects custom interpreter in temp file mode', async () => {
    vi.mocked(getAnnotations).mockImplementationOnce(((x: any) => ({
      interpreter: x.interpreter,
    })) as any)

    expect(
      getCellProgram({ metadata: { interpreter: 'bun' } } as any, {} as any, 'javascript'),
    ).toStrictEqual({
      commandMode: COMMAND_MODE_TEMP_FILE,
      programName: 'bun',
    })
  })
})

suite('getCellCwd', () => {
  const projectRoot = '/project'
  const mdFilePath = '/project/folder/DOC.md'

  const testGetCellCwd = async (
    frontmatter?: string,
    annotation?: string,
    existingFolders?: string[],
    disableMdFile = false,
  ) => {
    const mdFile = disableMdFile ? undefined : mdFilePath

    vi.mocked(getWorkspaceFolder).mockReturnValueOnce({
      uri: Uri.file(projectRoot),
    } as any)

    vi.mocked(getAnnotations).mockReturnValueOnce({
      cwd: annotation,
    } as any)

    vi.mocked(fs.stat).mockImplementation((async (p: string) => ({
      isDirectory: () => existingFolders?.includes(path.normalize(p)),
    })) as any)

    const cwd = await getCellCwd(
      {} as any,
      {
        metadata: {
          'runme.dev/frontmatterParsed': {
            cwd: frontmatter,
          },
        },
      } as any,
      mdFile ? Uri.file(mdFile) : undefined,
    )

    vi.mocked(fs.stat).mockReset()

    return cwd
  }

  test('falls back when cwd doesnt exist', async () => {
    const files = ['/project/folder']

    expect(await testGetCellCwd(undefined, './non_existant', files)).toStrictEqual(
      '/project/folder',
    )
  })

  test('no notebook file', async () => {
    expect(await testGetCellCwd(undefined, undefined, undefined, true)).toStrictEqual(undefined)
  })

  test('no frontmatter', async () => {
    const files = ['/project/folder', '/project', '/project/', '/tmp', '/opt']

    expect(await testGetCellCwd(undefined, undefined, files)).toStrictEqual(
      path.dirname(mdFilePath),
    )

    expect(await testGetCellCwd(undefined, '../', files)).toStrictEqual(
      path.dirname(path.dirname(mdFilePath)) + '/',
    )

    expect(await testGetCellCwd(undefined, '/opt', files)).toStrictEqual('/opt')
  })

  test('absolute frontmatter', async () => {
    const files = ['/project/folder', '/project', '/project/', '/tmp', '/opt', '/']
    const frntmtr = '/tmp'

    expect(await testGetCellCwd(frntmtr, undefined, files)).toStrictEqual('/tmp')

    expect(await testGetCellCwd(frntmtr, '../', files)).toStrictEqual('/')

    expect(await testGetCellCwd(frntmtr, '/opt', files)).toStrictEqual('/opt')
  })

  test('relative frontmatter', async () => {
    const files = ['/project/folder', '/project', '/project/', '/tmp', '/opt', '/']
    const frntmtr = '../'

    expect(await testGetCellCwd(frntmtr, undefined, files)).toStrictEqual(
      path.dirname(path.dirname(mdFilePath)) + '/',
    )

    expect(await testGetCellCwd(frntmtr, '../', files)).toStrictEqual('/')

    expect(await testGetCellCwd(frntmtr, '/opt', files)).toStrictEqual('/opt')
  })
})
