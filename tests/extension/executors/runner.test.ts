import { test, suite, expect, vi } from 'vitest'
import { window } from 'vscode'

import { resolveRunProgramExecution } from '../../../src/extension/executors/runner'

vi.mock('vscode-telemetry', () => ({}))
vi.mock('vscode')

suite('resolveRunProgramExecution', () => {
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
