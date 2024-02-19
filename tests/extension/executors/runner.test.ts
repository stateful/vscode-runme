import { test, suite, beforeEach, expect, vi } from 'vitest'
import { window } from 'vscode'

import {
  parseCommandSeq,
  prepareCmdSeq,
  resolveRunProgramExecution,
} from '../../../src/extension/executors/runner'

vi.mock('vscode-telemetry', () => ({}))
vi.mock('vscode')

vi.mock('../../../src/extension/constants', () => ({
  PLATFORM_OS: 'darwin',
}))

suite('resolveRunProgramExecution', () => {
  test('resolves inline export block', async () => {
    const execution = await resolveRunProgramExecution(
      'export TEST="test\n123\n456\n"',
      'sh',
      1,
      true,
      new Set<string>(),
    )
    expect(execution).toMatchInlineSnapshot(`
      {
        "commands": [
          "export TEST="test",
          "123",
          "456",
          """,
        ],
        "type": "commands",
      }
    `)
  })

  test('resolves inline script without exports', async () => {
    const execution = await resolveRunProgramExecution(
      'echo "Hello World!"',
      'sh',
      1,
      true,
      new Set<string>(),
    )
    expect(execution).toMatchInlineSnapshot(`
      {
        "commands": [
          "echo "Hello World!"",
        ],
        "type": "commands",
      }
    `)
  })

  test('rejects when a input box was canceled', async () => {
    vi.mocked(window.showInputBox).mockResolvedValueOnce(undefined)
    const execution = resolveRunProgramExecution(
      'export TEST="return undefined"',
      'sh',
      1,
      true,
      new Set<string>(),
    )
    expect(execution).rejects.toThrowError('Cannot run cell due to canceled prompt')
  })

  test('resolves inline script with exports', async () => {
    vi.mocked(window.showInputBox).mockImplementation(async (opts) => opts?.placeHolder)
    const execution = await resolveRunProgramExecution(
      // eslint-disable-next-line max-len
      'echo "Auth token for service foo"\nexport SERVICE_FOO_TOKEN="foobar"\necho "Auth token for service bar"\nexport SERVICE_BAR_TOKEN="barfoo"\n',
      'sh',
      1,
      true,
      new Set<string>(),
    )
    expect(execution).toMatchInlineSnapshot(`
      {
        "commands": [
          "echo "Auth token for service foo"",
          "export SERVICE_FOO_TOKEN="foobar"",
          "",
          "echo "Auth token for service bar"",
          "export SERVICE_BAR_TOKEN="barfoo"",
          "",
          "",
        ],
        "type": "commands",
      }
    `)
  })

  test('resolves shebang with temp file', async () => {
    const execution = await resolveRunProgramExecution(
      'print("Hello Pythonista 🐍")',
      'py',
      2,
      true,
      new Set<string>(),
    )
    expect(execution).toMatchInlineSnapshot(`
      {
        "script": "print("Hello Pythonista 🐍")",
        "type": "script",
      }
    `)
  })

  suite('resolves vercel', () => {
    test('preview', async () => {
      const execution = await resolveRunProgramExecution('vercel', 'sh', 1, true, new Set<string>())
      expect(execution).toMatchInlineSnapshot(`
      {
        "commands": [
          "set -e -o pipefail; vercel",
        ],
        "type": "commands",
      }
    `)
    })

    test('production', async () => {
      process.env['vercelProd'] = 'true'
      const execution = await resolveRunProgramExecution('vercel', 'sh', 1, true, new Set<string>())
      expect(execution).toMatchInlineSnapshot(`
        {
          "commands": [
            "set -e -o pipefail; vercel --prod",
          ],
          "type": "commands",
        }
      `)
    })
  })
})

suite('parseCommandSeq', () => {
  beforeEach(() => {
    vi.mocked(window.showInputBox).mockReset()
  })

  test('single-line export with prompt', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const res = await parseCommandSeq(['$ export TEST="<placeholder>"'].join('\n'), 'sh')

    expect(res).toBeTruthy()
    expect(res).toHaveLength(3)
    expect(res?.[1]).toBe('export TEST="test value"')
  })

  test('single-line export with prompt disabled', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

    const res = await parseCommandSeq(['export TEST="placeholder"'].join('\n'), 'sh', false)

    expect(window.showInputBox).toBeCalledTimes(0)

    expect(res).toBeTruthy()
    expect(res).toHaveLength(1)
    expect(res![0]).toBe('export TEST="placeholder"')
  })

  test('single line export with cancelled prompt', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => undefined)

    const res = await parseCommandSeq(['export TEST="<placeholder>"'].join('\n'), 'sh')

    expect(res).toBe(undefined)
  })

  test('non shell code with exports retains leading dollar signs', async () => {
    vi.mocked(window.showInputBox).mockImplementationOnce(async () => undefined)

    const res = await parseCommandSeq(
      [
        "$currentDateTime = date('Y-m-d H:i:s');",
        '$fullGreeting = $greeting . " It\'s now " . $currentDateTime;',
        'echo $fullGreeting;',
      ].join('\n'),
      'php',
    )

    expect(res).toBeTruthy()
    expect(res).toStrictEqual([
      "$currentDateTime = date('Y-m-d H:i:s');",
      '$fullGreeting = $greeting . " It\'s now " . $currentDateTime;',
      'echo $fullGreeting;',
    ])
  })

  test('multiline export', async () => {
    const exportLines = ['export TEST="I', 'am', 'doing', 'well!"']

    const res = await parseCommandSeq(exportLines.join('\n'), 'sh')

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

    const res = await parseCommandSeq(cmdLines.join('\n'), 'sh')

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

    const res = await parseCommandSeq(cmdLines.join('\n'), 'sh', true, new Set())

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
})

suite('prepareCmdSeq', () => {
  test('should eliminate leading dollar signs', () => {
    expect(prepareCmdSeq('$ echo hi')).toStrictEqual(['echo hi'])
    expect(prepareCmdSeq('  $  echo hi')).toStrictEqual(['echo hi'])
    expect(prepareCmdSeq('echo 1\necho 2\n $ echo 4')).toStrictEqual(['echo 1', 'echo 2', 'echo 4'])
  })
})
