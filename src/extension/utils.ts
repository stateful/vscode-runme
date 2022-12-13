import path from 'node:path'
import util from 'node:util'
import cp from 'node:child_process'

import vscode, { FileType } from 'vscode'

import { CONFIGURATION_SHELL_DEFAULTS } from '../constants'

import executor from './executors'
import { ENV_STORE, DEFAULT_ENV } from './constants'

const HASH_PREFIX_REGEXP = /^\s*\#\s*/g

export function getExecutionProperty (property: keyof typeof CONFIGURATION_SHELL_DEFAULTS, cell: vscode.NotebookCell) {
  const config = vscode.workspace.getConfiguration('runme.shell')
  const configSetting = config.get<boolean>(property, CONFIGURATION_SHELL_DEFAULTS[property])

  /**
   * if cell is marked as interactive (default: not set or set to 'true')
   */
  if (typeof cell.metadata?.[property] === 'string') {
    return cell.metadata[property] === 'true'
  }

  return configSetting
}

export function getTerminalByCell (cell: vscode.NotebookCell) {
  return vscode.window.terminals.find((t) => {
    const taskEnv = (t.creationOptions as vscode.TerminalOptions).env || {}
    return taskEnv.RUNME_ID === `${cell.document.fileName}:${cell.index}`
  })
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
  // if (text.startsWith('vercel ')) {
  //   return 'vercel'
  // }
  return runningCell.languageId as keyof typeof executor
}

/**
 * treat cells like like a series of individual commands
 * which need to be executed in sequence
 */
export function getCmdShellSeq(cellText: string, os: string): string {
  const trimmed = cellText.trimStart()
    .split('\\\n').map(l => l.trim()).join(' ')
    .split('\n').map(l => {
      const hashPos = l.indexOf('#')
      if (hashPos > -1) {
        return l.substring(0, hashPos).trim()
      }
      const stripped = l.trim()

      if (stripped.startsWith('$')) {
        return stripped.slice(1).trim()
      } else {
        return stripped
      }
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

export function normalizeLanguage(l?: string) {
  switch (l) {
    case 'zsh':
    case 'shell':
      return 'sh'
    default:
      return l
  }
}

export async function verifyCheckedInFile (filePath: string) {
  const fileDir = path.dirname(filePath)
  const workspaceFolder = vscode.workspace.workspaceFolders?.find((ws) => fileDir.includes(ws.uri.fsPath))

  if (!workspaceFolder) {
    return false
  }

  const hasGitDirectory = await vscode.workspace.fs.stat(workspaceFolder.uri).then(
    (stat) => stat.type === FileType.Directory,
    () => false
  )
  if (!hasGitDirectory) {
    return false
  }

  const isCheckedIn = await util.promisify(cp.exec)(
    `git ls-files --error-unmatch ${filePath}`,
    { cwd: workspaceFolder.uri.fsPath }
  ).then(() => true, () => false)
  return isCheckedIn
}
