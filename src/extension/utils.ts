import vscode from 'vscode'

import { CONFIGURATION_SHELL_DEFAULTS } from '../constants'

import executor from './executors'
import { ENV_STORE, DEFAULT_ENV } from './constants'

const ENV_VAR_REGEXP = /(\$\w+)/g
const HASH_PREFIX_REGEXP = /^\s*\#\s*/g

export function getExecutionProperty (property: keyof typeof CONFIGURATION_SHELL_DEFAULTS, cell: vscode.NotebookCell) {
  const config = vscode.workspace.getConfiguration('runme.shell')
  const configSetting = config.get<boolean>(property, CONFIGURATION_SHELL_DEFAULTS[property])

  /**
   * if cell is marked as interactive (default: not set or set to 'true')
   */
  if (typeof cell.metadata?.attributes?.[property] === 'string') {
    return cell.metadata.attributes[property] === 'true'
  }

  return configSetting
}

export function getTerminalByCell (cell: vscode.NotebookCell) {
  return vscode.window.terminals.find((t) => {
    const taskEnv = (t.creationOptions as vscode.TerminalOptions).env || {}
    return taskEnv.RUNME_ID === `${cell.document.fileName}:${cell.index}`
  })
}

export function populateEnvVar (value: string, env = process.env) {
  for (const m of value.match(ENV_VAR_REGEXP) || []) {
    const envVar = m.slice(1) // slice out '$'
    value = value.replace(m, env[envVar] || '')
  }

  return value
}

export function resetEnv () {
  [...ENV_STORE.keys()].forEach((key) => ENV_STORE.delete(key))
  Object.entries(DEFAULT_ENV).map(([key, val]) => ENV_STORE.set(key, val))
}

export function getKey (runningCell: vscode.TextDocument): keyof typeof executor {
  const text = runningCell.getText()
  if (text.indexOf('deployctl deploy') > -1) {
    return 'deno'
  }
  return runningCell.languageId as keyof typeof executor
}

/**
 * treat cells like like a series of individual commands
 * which need to be executed in sequence
 */
export function getCmdShellSeq(cellText: string, os: string): string {
  const trimmed = cellText
    .split('\\\n').map(l => l.trim()).join(' ')
    .split('\n').map(l => {
      const hashPos = l.indexOf('#')
      if (hashPos > -1) {
        return l.substring(0, hashPos).trim()
      }
      return l.trim()
    })
    .filter(l => {
      const hasPrefix = (l.match(HASH_PREFIX_REGEXP) || []).length > 0
      return l !== '' && !hasPrefix
    }).join('; ')

  if (['darwin'].find(entry => entry === os)) {
    return `set -e -o pipefail; ${trimmed}`
  } else if (os.toLocaleLowerCase().startsWith('win')) {
    return trimmed
  }

  return `set -e; ${trimmed}`
}
