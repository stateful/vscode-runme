import path from 'node:path'
import util from 'node:util'
import cp from 'node:child_process'

import vscode, { FileType, Uri, workspace, NotebookDocument } from 'vscode'
import { v5 as uuidv5 } from 'uuid'

import { NotebookCellAnnotations, Serializer } from '../types'
import { METADATA_DEFAULTS } from '../constants'

import executor from './executors'
import { Kernel } from './kernel'
import { ENV_STORE, DEFAULT_ENV } from './constants'

declare var globalThis: any

const HASH_PREFIX_REGEXP = /^\s*\#\s*/g
const TRUTHY_VALUES = ['1', 'true']

/**
 * Annotations are stored as subset of metadata
 */
export function getAnnotations(cell: vscode.NotebookCell): NotebookCellAnnotations
export function getAnnotations(metadata?: Serializer.Metadata): NotebookCellAnnotations
export function getAnnotations(raw: unknown): NotebookCellAnnotations {
  const config = vscode.workspace.getConfiguration('runme.shell')
  const metadataFromCell = raw as vscode.NotebookCell
  let metadata = raw as Serializer.Metadata

  if (metadataFromCell.metadata) {
    metadata = metadataFromCell.metadata
  }

  return <NotebookCellAnnotations>{
    background:
      typeof metadata.background === 'string'
        ? TRUTHY_VALUES.includes(metadata.background)
        : METADATA_DEFAULTS.background,
    interactive:
      typeof metadata.interactive === 'string'
        ? TRUTHY_VALUES.includes(metadata.interactive)
        : config.get<boolean>('interactive', METADATA_DEFAULTS.interactive),
    closeTerminalOnSuccess:
      typeof metadata.closeTerminalOnSuccess === 'string'
        ? TRUTHY_VALUES.includes(metadata.closeTerminalOnSuccess)
        : config.get<boolean>('closeTerminalOnSuccess', METADATA_DEFAULTS.closeTerminalOnSuccess),
    mimeType: typeof metadata.mimeType === 'string' ? metadata.mimeType : METADATA_DEFAULTS.mimeType,
    name: metadata.name || metadata['runme.dev/name'] || `Cell #${Math.random().toString().slice(2)}`,
    'runme.dev/uuid': metadata['runme.dev/uuid'],
  }
}

export function getTerminalByCell(cell: vscode.NotebookCell) {
  return vscode.window.terminals.find((t) => {
    const taskEnv = (t.creationOptions as vscode.TerminalOptions).env || {}
    return taskEnv.RUNME_ID === `${cell.document.fileName}:${cell.index}`
  })
}

export function resetEnv() {
  [...ENV_STORE.keys()].forEach((key) => ENV_STORE.delete(key))
  Object.entries(DEFAULT_ENV).map(([key, val]) => ENV_STORE.set(key, val))
}

export function getKey(runningCell: vscode.TextDocument): keyof typeof executor {
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
  const trimmed = cellText
    .trimStart()
    .split('\\\n')
    .map((l) => l.trim())
    .join(' ')
    .split('\n')
    .map((l) => {
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
    .filter((l) => {
      const hasPrefix = (l.match(HASH_PREFIX_REGEXP) || []).length > 0
      return l !== '' && !hasPrefix
    })
    .join('; ')

  if (['darwin'].find((entry) => entry === os)) {
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

export async function verifyCheckedInFile(filePath: string) {
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

  const isCheckedIn = await util
    .promisify(cp.exec)(`git ls-files --error-unmatch ${filePath}`, { cwd: workspaceFolder.uri.fsPath })
    .then(
      () => true,
      () => false
    )
  return isCheckedIn
}

export async function canEditFile(
  notebook: NotebookDocument,
  // for testing purposes only
  verifyCheckedInFileFn = verifyCheckedInFile
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration('runme.flags')
  const disableSaveRestriction = config.get<boolean>('disableSaveRestriction', true)
  const currentDocumentPath = notebook.uri.fsPath
  const isNewFile = notebook.isUntitled && notebook.notebookType === Kernel.type

  /**
   * allow serializing files if:
   */
  if (
    /**
     * the user has disabled this restriction
     */
    disableSaveRestriction ||
    /**
     * the user just created a new file
     */
    isNewFile ||
    /**
     * the user works on a checked in file
     */
    !currentDocumentPath ||
    (await verifyCheckedInFileFn(currentDocumentPath))
  ) {
    return true
  }

  return false
}

export async function initWasm(wasmUri: Uri) {
  const go = new globalThis.Go()
  const wasmFile = await workspace.fs.readFile(wasmUri)
  return WebAssembly.instantiate(wasmFile, go.importObject).then(
    (result) => {
      go.run(result.instance)
    },
    (err: Error) => {
      console.error(`[Runme] failed initializing WASM file: ${err.message}`)
      return err
    }
  )
}

export function getDefaultWorkspace(): string | undefined {
  return workspace.workspaceFolders && workspace.workspaceFolders.length > 0
      ? workspace.workspaceFolders[0].uri.fsPath
    : undefined
}

export async function getPathType(uri: vscode.Uri): Promise<vscode.FileType> {
  return workspace.fs.stat(uri).then(
    (stat) => stat.type,
    () => FileType.Unknown
  )
}

export function mapGitIgnoreToGlobFolders(gitignoreContents: string[]): Array<string | undefined> {
  const entries = gitignoreContents
    .filter((entry: string) => entry)
    .map((entry: string) => entry.replace(/\s/g, ''))
    .map((entry: string) => {
      if (entry) {
        let firstChar = entry.charAt(0)
        if (firstChar === '!' || firstChar === '/') {
          entry = entry.substring(1, entry.length)
          firstChar = entry.charAt(0)
        }
        const hasExtension = path.extname(entry)
        const slashPlacement = entry.charAt(entry.length - 1)
        if (slashPlacement === '/') {
          return `**/${entry}**`
        }
        if (hasExtension || ['.', '*', '#'].includes(firstChar)) {
          return
        }
        return `**/${entry}/**`
      }
    }).filter((entry: string | undefined) => entry)

  return [...new Set(entries)]
}

export function hashDocumentUri(uri: string): string {
  const salt = vscode.env.machineId
  const namespace = uuidv5(salt, uuidv5.URL)
  return uuidv5(uri, namespace).toString()
}
