import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

import {
  NotebookCellOutput,
  NotebookCellOutputItem,
  window,
  NotebookData,
  NotebookCell,
  NotebookCellData,
  Uri,
  NotebookDocument,
  workspace,
  WorkspaceFolder,
} from 'vscode'

import { DEFAULT_PROMPT_ENV, OutputType, RUNME_FRONTMATTER_PARSED } from '../../constants'
import type { CellOutputPayload, Serializer, ShellType } from '../../types'
import { NotebookCellOutputManager } from '../cell'
import { getAnnotations, getWorkspaceFolder, isDaggerShell } from '../utils'
import { CommandMode, CommandModeEnum } from '../grpc/runner/types'
import { RunmeFsScheme } from '../provider/runmeFs'

const HASH_PREFIX_REGEXP = /^\s*\#\s*/g
const ENV_VAR_REGEXP = /(\$\w+)/g
/**
 * for understanding post into https://jex.im/regulex/
 */
const EXPORT_EXTRACT_REGEX = /(\n*)export \w+=(("[^"]*")|('[^']*')|(.+(?=(\n|;))))/gim

export function renderError(outputs: NotebookCellOutputManager, output: string) {
  return outputs.replaceOutputs(
    new NotebookCellOutput([
      NotebookCellOutputItem.json(
        <CellOutputPayload<OutputType.error>>{
          type: OutputType.error,
          output,
        },
        OutputType.error,
      ),
    ]),
  )
}

export function populateEnvVar(value: string, env = process.env) {
  for (const m of value.match(ENV_VAR_REGEXP) || []) {
    const envVar = m.slice(1) // slice out '$'
    value = value.replace(m, env[envVar] || '')
  }

  return value
}

export interface CommandExportExtractMatch {
  type: 'exec' | 'prompt' | 'direct'
  key: string
  value: string
  match: string
  regexpMatch?: RegExpExecArray
  hasStringValue: boolean
  isPassword?: boolean
}

export async function promptUserForVariable(
  key: string,
  placeHolder: string,
  hasStringValue: boolean,
  password: boolean,
): Promise<string | undefined> {
  return await window.showInputBox({
    title: `Set Environment Variable "${key}"`,
    ignoreFocusOut: true,
    placeHolder,
    password,
    prompt: 'Your shell script wants to set some environment variables, please enter them here.',
    ...(hasStringValue ? { value: placeHolder } : {}),
  })
}

export function getCommandExportExtractMatches(
  rawText: string,
  supportsDirect = true,
  supportsPrompt = DEFAULT_PROMPT_ENV,
): CommandExportExtractMatch[] {
  const test = new RegExp(EXPORT_EXTRACT_REGEX)

  const matchStr = rawText.endsWith('\n') ? rawText : `${rawText}\n`

  let match: RegExpExecArray | null

  const result: CommandExportExtractMatch[] = []

  while ((match = test.exec(matchStr)) !== null) {
    const e = match[0]

    const [key, ph] = e.trim().slice('export '.length).split('=')
    const hasStringValue = ph.startsWith('"') || ph.startsWith("'")
    const placeHolder = hasStringValue ? ph.slice(1, -1) : ph

    let matchType: CommandExportExtractMatch['type']
    let value = placeHolder

    if (placeHolder.startsWith('$(') && placeHolder.endsWith(')')) {
      matchType = 'exec'
      value = placeHolder.slice(2, -1)
    } else if (!placeHolder.includes('\n') && supportsPrompt) {
      matchType = 'prompt'
    } else if (supportsDirect) {
      matchType = 'direct'
    } else {
      continue
    }

    result.push({
      type: matchType,
      regexpMatch: match,
      key,
      value,
      match: e,
      hasStringValue,
    })
  }

  return result
}

/**
 * Try to get shell path from environment (`$SHELL`)
 *
 * @param execKey Used as fallback in case `$SHELL` is not present
 */
export function getSystemShellPath(): string | undefined
export function getSystemShellPath(execKey: string): string
export function getSystemShellPath(execKey?: string): string | undefined
export function getSystemShellPath(execKey?: string): string | undefined {
  return process.env.SHELL ?? execKey
}

export function getNotebookSkipPromptEnvSetting(
  notebook: NotebookData | Serializer.Notebook | NotebookDocument,
): boolean {
  const notebookMetadata = notebook.metadata as Serializer.Metadata | undefined
  const frontmatter = notebookMetadata?.[RUNME_FRONTMATTER_PARSED]
  return frontmatter?.skipPrompts || false
}

export function getCellShellPath(
  cell: NotebookCell | NotebookCellData | Serializer.Cell,
  notebook: NotebookData | Serializer.Notebook | NotebookDocument,
  execKey?: string,
): string | undefined {
  const notebookMetadata = notebook.metadata as Serializer.Metadata | undefined

  const frontmatter = notebookMetadata?.[RUNME_FRONTMATTER_PARSED]

  if (frontmatter?.shell) {
    return frontmatter.shell
  }

  if (
    !execKey &&
    'document' in cell &&
    (cell.document.languageId === 'sh' || cell.document.languageId === 'bash')
  ) {
    return getSystemShellPath(cell.document.languageId)
  }

  return getSystemShellPath(execKey)
}

export function isShellLanguage(languageId: string): ShellType | undefined {
  switch (languageId.toLowerCase()) {
    case 'daggercall':
    case 'daggershell':
      return 'sh'
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'ksh':
    case 'shell':
    case 'shellscript':
      return 'sh'

    case 'bat':
    case 'cmd':
      return 'cmd'

    case 'powershell':
    case 'pwsh':
      return 'powershell'

    case 'fish':
      return 'fish'

    default:
      return undefined
  }
}

export function getCellProgram(
  cell: NotebookCell | NotebookCellData | Serializer.Cell,
  notebook: NotebookData | Serializer.Notebook | NotebookDocument,
  execKey: string,
): { programName: string; commandMode: CommandMode } {
  let result: { programName: string; commandMode: CommandMode }
  const { interpreter } = getAnnotations(cell.metadata)

  const { INLINE_SHELL, TEMP_FILE, DAGGER } = CommandModeEnum()

  const parsedFrontmatter = notebook.metadata?.['runme.dev/frontmatterParsed']
  if (isDaggerShell(parsedFrontmatter?.shell ?? '')) {
    const shellPath = getCellShellPath(cell, notebook, execKey) ?? execKey

    return {
      programName: shellPath,
      commandMode: DAGGER,
    }
  }

  if (isShellLanguage(execKey)) {
    const shellPath = getCellShellPath(cell, notebook, execKey) ?? execKey

    result = {
      programName: shellPath,
      commandMode: INLINE_SHELL,
    }
  } else {
    // TODO(mxs): make this configurable!!
    result = {
      programName: '',
      commandMode: TEMP_FILE,
    }
  }

  if (interpreter) {
    result.programName = interpreter
  }

  return result
}

export async function getCellCwd(
  cell: NotebookCell | NotebookCellData | Serializer.Cell,
  notebook?: NotebookData | NotebookDocument | Serializer.Notebook,
  notebookFile?: Uri,
): Promise<string | undefined> {
  let res: string | undefined

  const getParent = (p?: string) => (p ? path.dirname(p) : undefined)

  const candidates = [
    getWorkspaceFolder(notebookFile)?.uri.fsPath,
    getParent(notebookFile?.fsPath),
    // TODO: support windows here
    (notebook?.metadata as Serializer.Metadata | undefined)?.[RUNME_FRONTMATTER_PARSED]?.cwd,
    getAnnotations(cell.metadata as Serializer.Metadata | undefined).cwd,
  ].filter(Boolean)

  if (notebook && 'uri' in notebook && notebook.uri.scheme === RunmeFsScheme) {
    const folders: readonly WorkspaceFolder[] = workspace.workspaceFolders || []
    if (folders.length > 0) {
      candidates.push(...folders.map((f) => f.uri.fsPath))
    } else {
      const fallbackCwd = await fs.mkdtemp(path.join(os.tmpdir(), 'runme-fallback-cwd-'))
      candidates.push(fallbackCwd)
    }
  }

  for (let candidate of candidates) {
    if (!candidate) {
      continue
    }
    candidate = resolveOrAbsolute(res, candidate)

    if (candidate) {
      const folderExists = await fs.stat(candidate).then(
        (f) => f.isDirectory(),
        () => false,
      )

      if (!folderExists) {
        continue
      }

      res = candidate
    }
  }

  return res
}

function resolveOrAbsolute(parent?: string, child?: string): string | undefined {
  if (!child) {
    return parent
  }

  if (path.isAbsolute(child)) {
    return child
  }

  if (parent) {
    return path.join(parent, child)
  }

  return child
}

/**
 * treat cells like a series of individual commands
 * which need to be executed in sequence
 */
export function getCmdSeq(cellText: string): string[] {
  return cellText
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
}

/**
 * treat cells like like a series of individual commands
 * which need to be executed in sequence
 *
 * packages command sequence into single callable script
 */
export function getCmdShellSeq(cellText: string, os: string): string {
  const trimmed = getCmdSeq(cellText).join('; ')

  if (['darwin'].find((entry) => entry === os)) {
    return `set -e -o pipefail; ${trimmed}`
  } else if (os.toLocaleLowerCase().startsWith('win')) {
    return trimmed
  }

  return `set -e; ${trimmed}`
}
