import { test, suite, expect, vi } from 'vitest'
import { window } from 'vscode'

import {
  prepareCommandSeq,
  promptVariablesAsync,
  resolveRunProgramExecution,
} from '../../../src/extension/executors/runner'
import {
  ResolveProgramResponse_Status,
  ResolveProgramResponse_VarResult,
} from '../../../src/extension/grpc/runner/v1'

vi.mock('vscode-telemetry', () => ({}))
vi.mock('vscode')

vi.mock('../../../src/extension/constants', () => ({
  PLATFORM_OS: 'darwin',
}))

vi.mock('../../../src/extension/executors/runner/factory', () => ({
  createRunProgramOptions: vi.fn(),
}))

const MockRunner: any = {
  createProgramResolver: vi.fn().mockResolvedValue({
    resolveProgram: vi.fn().mockResolvedValue({ response: { vars: [] } }),
  }),
}

vi.mock('../../../src/extension/executors/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    promptUserForVariable: vi.fn().mockResolvedValue('mockedUserInput'),
  }
})

const MockRunnerEnv: any = {
  getSessionId: vi.fn().mockReturnValue('mock-session-id'),
}

suite('resolveRunProgramExecution', () => {
  test.skip('resolves inline export block', async () => {
    const execution = await resolveRunProgramExecution(
      {} as any,
      {} as any,
      {} as any,
      'export TEST="test\n123\n456\n"',
      'sh',
      1,
      0, // ResolveProgramRequest_Mode.Auto
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

  test.skip('resolves inline script without exports', async () => {
    const execution = await resolveRunProgramExecution(
      {} as any,
      {} as any,
      {} as any,
      'echo "Hello World!"',
      'sh',
      1,
      0, // ResolveProgramRequest_Mode.Auto
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

  test.skip('rejects when a input box was canceled', async () => {
    vi.mocked(window.showInputBox).mockResolvedValueOnce(undefined)
    const execution = resolveRunProgramExecution(
      {} as any,
      {} as any,
      {} as any,
      'export TEST="return undefined"',
      'sh',
      1,
      0, // ResolveProgramRequest_Mode.Auto
    )
    expect(execution).rejects.toThrowError('Cannot run cell due to canceled prompt')
  })

  test.skip('resolves inline script with exports', async () => {
    vi.mocked(window.showInputBox).mockImplementation(async (opts) => opts?.placeHolder)
    const execution = await resolveRunProgramExecution(
      {} as any,
      {} as any,
      {} as any,
      // eslint-disable-next-line max-len
      'echo "Auth token for service foo"\nexport SERVICE_FOO_TOKEN="foobar"\necho "Auth token for service bar"\nexport SERVICE_BAR_TOKEN="barfoo"\n',
      'sh',
      1,
      0, // ResolveProgramRequest_Mode.Auto
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
      MockRunner,
      MockRunnerEnv,
      {} as any,
      'print("Hello Pythonista 🐍")',
      'py',
      2,
      0, // ResolveProgramRequest_Mode.Auto
    )
    expect(execution).toMatchInlineSnapshot(`
      {
        "script": "print("Hello Pythonista 🐍")",
        "type": "script",
      }
    `)
  })
})

// todo(sebastian): refactor to test UI but not resolutin since it moved into kernel
// suite('parseCommandSeq', () => {
//   beforeEach(() => {
//     vi.mocked(window.showInputBox).mockReset()
//   })

//   test('single-line export with prompt', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

//     const res = await parseCommandSeq(['$ export TEST="<placeholder>"'].join('\n'), 'sh')

//     expect(res).toBeTruthy()
//     expect(res).toHaveLength(3)
//     expect(res?.[1]).toBe('export TEST="test value"')
//   })

//   test('single-line export with prompt disabled', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

//     const res = await parseCommandSeq(['export TEST="placeholder"'].join('\n'), 'sh', 'false')

//     expect(window.showInputBox).toBeCalledTimes(0)

//     expect(res).toBeTruthy()
//     expect(res).toHaveLength(1)
//     expect(res![0]).toBe('export TEST="placeholder"')
//   })

//   test('single line export with cancelled prompt', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => undefined)

//     const res = await parseCommandSeq(['export TEST="<placeholder>"'].join('\n'), 'sh')

//     expect(res).toBe(undefined)
//   })

//   test('non shell code with exports retains leading dollar signs', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => undefined)

//     const res = await parseCommandSeq(
//       [
//         "$currentDateTime = date('Y-m-d H:i:s');",
//         '$fullGreeting = $greeting . " It\'s now " . $currentDateTime;',
//         'echo $fullGreeting;',
//       ].join('\n'),
//       'php',
//     )

//     expect(res).toBeTruthy()
//     expect(res).toStrictEqual([
//       "$currentDateTime = date('Y-m-d H:i:s');",
//       '$fullGreeting = $greeting . " It\'s now " . $currentDateTime;',
//       'echo $fullGreeting;',
//     ])
//   })

//   test('multiline export', async () => {
//     const exportLines = ['export TEST="I', 'am', 'doing', 'well!"']

//     const res = await parseCommandSeq(exportLines.join('\n'), 'sh')

//     expect(res).toBeTruthy
//     expect(res).toHaveLength(4)
//     expect(res).toStrictEqual(exportLines)
//   })

//   test('exports between normal command sequences', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

//     const cmdLines = [
//       'echo "Hello!"',
//       'echo "Hi!"',
//       'export TEST="<placeholder>"',
//       'echo $TEST',
//       'export TEST_MULTILINE="This',
//       'is',
//       'a',
//       'multiline',
//       'env!"',
//       'echo $TEST_MULTILINE',
//     ]

//     const res = await parseCommandSeq(cmdLines.join('\n'), 'sh')

//     expect(res).toBeTruthy()
//     expect(res).toStrictEqual([
//       'echo "Hello!"',
//       'echo "Hi!"',
//       'export TEST="test value"',
//       '',
//       'echo $TEST',
//       ...['export TEST_MULTILINE="This', 'is', 'a', 'multiline', 'env!"'],
//       'echo $TEST_MULTILINE',
//     ])
//   })

//   test('exports between normal command sequences with getCmdSeq', async () => {
//     vi.mocked(window.showInputBox).mockImplementationOnce(async () => 'test value')

//     const cmdLines = [
//       'echo "Hello!"',
//       'echo "Hi!"',
//       'export TEST="<placeholder>"',
//       'echo $TEST',
//       'export TEST_MULTILINE="This',
//       'is',
//       'a',
//       'multiline',
//       'env!"',
//       'echo $TEST_MULTILINE',
//     ]

//     const res = await parseCommandSeq(cmdLines.join('\n'), 'sh', 0)

//     expect(res).toBeTruthy()
//     expect(res).toStrictEqual([
//       'echo "Hello!"',
//       'echo "Hi!"',
//       'export TEST="test value"',
//       '',
//       'echo $TEST',
//       ...['export TEST_MULTILINE="This', 'is', 'a', 'multiline', 'env!"'],
//       'echo $TEST_MULTILINE',
//     ])
//   })
// })

suite('prepareCmdSeq', () => {
  test('should eliminate leading dollar signs', () => {
    expect(prepareCommandSeq('$ echo hi', 'sh')).toStrictEqual(['echo hi'])
    expect(prepareCommandSeq('  $  echo hi', 'sh')).toStrictEqual(['echo hi'])
    expect(prepareCommandSeq('echo 1\necho 2\n $ echo 4', 'sh')).toStrictEqual([
      'echo 1',
      'echo 2',
      'echo 4',
    ])
  })

  test('should not remove leading dollar signs from heredoc', () => {
    const heredoc = `Foo="bar"
cat << EOF
$Foo
EOF`
    expect(prepareCommandSeq(heredoc, 'sh')).toStrictEqual(heredoc.split('\n'))
  })
})

suite('promptVariablesAsync function', () => {
  // Define individual tests within the suite
  type VarResult = ResolveProgramResponse_VarResult

  test('resolved status', async () => {
    const blocks = []
    const variable = {
      status: ResolveProgramResponse_Status.RESOLVED,
      resolvedValue: 'resolvedValue',
      name: 'variableName',
    } as VarResult

    await promptVariablesAsync(blocks, variable)

    expect(blocks).toEqual([{ type: 'single', content: 'export variableName="resolvedValue"' }])
  })

  test('unresolved with message status', async () => {
    const blocks = []
    const variable = {
      status: ResolveProgramResponse_Status.UNRESOLVED_WITH_MESSAGE,
      name: 'variableName',
    } as VarResult

    await promptVariablesAsync(blocks, variable)

    expect(blocks).toEqual([{ type: 'single', content: 'export variableName="mockedUserInput"' }])
  })

  test('unresolved with placeholder status', async () => {
    const blocks = []
    const variable = {
      status: ResolveProgramResponse_Status.UNRESOLVED_WITH_PLACEHOLDER,
      name: 'variableName',
    } as VarResult

    await promptVariablesAsync(blocks, variable)

    expect(blocks).toEqual([{ type: 'single', content: 'export variableName="mockedUserInput"' }])
  })

  test('unresolved with secret status', async () => {
    const blocks = []
    const variable = {
      status: ResolveProgramResponse_Status.UNRESOLVED_WITH_SECRET,
      name: 'variableName',
    } as VarResult

    await promptVariablesAsync(blocks, variable)

    expect(blocks).toEqual([{ type: 'single', content: 'export variableName="mockedUserInput"' }])
  })

  test('unspecified status', async () => {
    const blocks = []
    const variable = {
      status: ResolveProgramResponse_Status.UNSPECIFIED,
      name: 'variableName',
    } as VarResult

    await promptVariablesAsync(blocks, variable)

    expect(blocks).toEqual([])
  })
})
