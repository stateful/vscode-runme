import cp from 'node:child_process'
import path from 'node:path'

import { NotebookCellOutput, NotebookCellExecution, NotebookCellOutputItem, window } from 'vscode'

import { ENV_STORE } from '../constants'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

const ENV_VAR_REGEXP = /(\$\w+)/g
const EXPORT_EXTRACT_REGEX = /(\n*)export \w+=(("(.|\n)+(?="))|('.+(?='))|(.+(?=\n)))/gi

export function renderError (exec: NotebookCellExecution, output: string) {
  return exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(
      <CellOutput<OutputType.error>>{
        type: OutputType.error,
        output
      },
      OutputType.error
    )
  ]))
}

export function populateEnvVar (value: string, env = process.env) {
  for (const m of value.match(ENV_VAR_REGEXP) || []) {
    const envVar = m.slice(1) // slice out '$'
    value = value.replace(m, env[envVar] || '')
  }

  return value
}

/**
 * Helper method to parse the shell code and runs the following operations:
 *   - fetches environment variable exports and puts them into ENV_STORE
 *   - runs embedded shell scripts for exports, e.g. `exports=$(echo "foobar")`
 *
 * @param exec NotebookCellExecution
 * @returns cell text if all operation to retrieve the cell text could be executed, undefined otherwise
 */
export async function retrieveShellCommand (exec: NotebookCellExecution) {
  let cellText = exec.cell.document.getText()
  const cwd = path.dirname(exec.cell.document.uri.fsPath)
  const rawText = exec.cell.document.getText()
  const lines: string[] = rawText.split('\n').filter(Boolean)
  const exportMatches: string[] = []

  for (const l of lines) {
    const code = `${l}\n` // attach a new line so we can match the end of the value
    const exps = (code.match(EXPORT_EXTRACT_REGEX) || [])
      .map((m) => m.trim())
    exportMatches.push(...exps)
  }

  const stateEnv = Object.fromEntries(ENV_STORE)
  for (const e of exportMatches) {
    const [key, ph] = e.slice('export '.length).split('=')
    const hasStringValue = ph.startsWith('"') || ph.startsWith('\'')
    const quoteChar = ph[0]
    const placeHolder = hasStringValue ? ph.slice(1) : ph

    if (placeHolder.startsWith('$(') && placeHolder.endsWith(')')) {
      /**
       * evaluate expression
       */
      const expression = placeHolder.slice(2, -1)
      const expressionProcess = cp.spawn(expression, {
        cwd,
        shell: true
      })
      const [isError, data] = await new Promise<[number, string]>((resolve) => {
        let data = ''
        expressionProcess.stdout.on('data', (payload) => { data += payload.toString() })
        expressionProcess.stderr.on('data', (payload) => { data += payload.toString() })
        expressionProcess.on('close', (code) => {
          if (code && code > 0) {
            return resolve([code, data])
          }

          return resolve([0, data])
        })
      })

      if (isError) {
        window.showErrorMessage(`Failed to evaluate expression "${expression}": ${data}`)
        return undefined
      }

      stateEnv[key] = data
    } else {
      /**
       * ask user for value
       */
      stateEnv[key] = populateEnvVar(await window.showInputBox({
        title: `Set Environment Variable "${key}"`,
        ignoreFocusOut: true,
        placeHolder,
        prompt: 'Your shell script wants to set some environment variables, please enter them here.',
        ...(hasStringValue ? { value: placeHolder } : {})
      }) || '', {...process.env, ...stateEnv })
    }

    /**
     * we don't want to run these exports anymore as we already stored
     * them in our extension state
     */
    cellText = cellText.replace(
      /**
       * In case of `export foo="bar", our match includes the preceeding '"' but not
       * the ending one. To properly cut out the line from the script we need to add
       * it back again.
       */
      e + (hasStringValue ? quoteChar : ''),
      ''
    )

    /**
     * persist env variable in memory
     */
    ENV_STORE.set(key, stateEnv[key])
  }
  return cellText
}
