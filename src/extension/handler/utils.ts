import url from 'node:url'

import { workspace, window, Uri, ExtensionContext, NotebookCellKind, commands } from 'vscode'

import { BOOTFILE, BOOTFILE_DEMO } from '../constants'
import { Kernel } from '../kernel'
import getLogger from '../logger'
import {
  CELL_CREATION_DATE_STORAGE_KEY,
  EXECUTION_CELL_STORAGE_KEY,
  FOCUS_CELL_STORAGE_KEY,
} from '../../constants'

const config = workspace.getConfiguration('runme.checkout')
const log = getLogger('RunmeUriHandler')

function fsExists(uri: Uri) {
  return workspace.fs.stat(uri).then(
    () => true,
    () => false,
  )
}

/**
 * Get the project directory from the settings object.
 *
 * If none is set up, the directory will be a temporary directory.
 *
 * If the set up directory doesn't exist, it will ask whether to create it and if not
 * we return `null` meaning we should cancel the checkout operation.
 *
 * @returns `vscode.Uri` with target directory to check out the project to
 *          `null` if the user doesn't want to create the directory, here we should cancel the operation
 */
export async function getProjectDir(context: ExtensionContext) {
  const projectDirPath: string | undefined = config.get('projectDir')

  if (!projectDirPath) {
    return context.globalStorageUri
  }

  const projectDir = Uri.parse(url.pathToFileURL(projectDirPath).toString())
  const isExisting = await fsExists(projectDir)
  if (isExisting) {
    return projectDir
  }

  const createDir =
    (await window.showInformationMessage(
      `A project directory (${projectDir}) was set up but doesn't exist. ` +
        'Do you want to create it?',
      'Yes',
      'No',
    )) === 'Yes'

  if (!createDir) {
    return null
  }

  await workspace.fs.createDirectory(projectDir)
  return projectDir
}

/**
 * Create the name of the target directory to checkout a project to
 * @param targetDir Uri of the base directory (received by calling `getProjectDir`)
 * @param suggestedName name of the directory to check the project into, e.g. "org/projectName"
 * @param index index which increases if directory name exists (e.g. "foobar_1")
 * @returns a string with the name of the target directory
 */
export async function getTargetDirName(
  targetDir: Uri,
  suggestedName: string,
  index = 0,
): Promise<string> {
  /**
   * for now let's expect a suggested name mimicking the format "<org>/<project>"
   */
  if (suggestedName.split('/').length !== 2) {
    throw new Error(`Invalid project directory suggestion: ${suggestedName}`)
  }

  /**
   * create org directory
   */
  const [orgName] = suggestedName.split('/')
  const orgDir = Uri.joinPath(targetDir, orgName)
  const isOrgDirExisting = await fsExists(orgDir)
  if (!isOrgDirExisting) {
    await workspace.fs.createDirectory(orgDir)
  }

  const amendedSuggestedName = !index ? suggestedName : `${suggestedName}_${index}`
  const fullTargetDir = Uri.joinPath(targetDir, amendedSuggestedName)
  const isExisting = await fsExists(fullTargetDir)
  if (isExisting) {
    return getTargetDirName(targetDir, suggestedName, ++index)
  }

  return amendedSuggestedName
}

export async function writeBootstrapFile(targetDirUri: Uri, fileToOpen: string) {
  const enc = new TextEncoder()
  await workspace.fs.writeFile(Uri.joinPath(targetDirUri, BOOTFILE), enc.encode(fileToOpen))
  log.info(`Created temporary bootstrap file to open ${fileToOpen}`)
}

export async function writeDemoBootstrapFile(targetDirUri: Uri, fileToOpen: string, cell: number) {
  const enc = new TextEncoder()
  await workspace.fs.writeFile(
    Uri.joinPath(targetDirUri, BOOTFILE_DEMO),
    enc.encode(cell !== undefined && cell >= 0 ? `${fileToOpen}#${cell}` : fileToOpen),
  )

  log.info(`Created temporary bootstrap file to open and run ${fileToOpen}#${cell}`)
}

/**
 * verify repository url has the right format and get suggested name from provided repository url
 */
const DOT_GIT_ANNEX = '.git'
const DOT_GIT_ANNEX_LENGTH = DOT_GIT_ANNEX.length
export function getSuggestedProjectName(repository: string) {
  /**
   * for "git@provider.com:org/project.git"
   */
  if (
    repository.startsWith('git@') &&
    repository.endsWith(DOT_GIT_ANNEX) &&
    repository.split(':').length === 2
  ) {
    return repository.slice(0, -DOT_GIT_ANNEX_LENGTH).split(':')[1]
  }

  /**
   * for "https://provider.com/org/project.git"
   */
  if (repository.startsWith('http') && repository.endsWith(DOT_GIT_ANNEX)) {
    return repository.split('/').slice(-2).join('/').slice(0, -DOT_GIT_ANNEX_LENGTH)
  }

  window.showErrorMessage(
    'Invalid git url, expected following format "git@provider.com:org/project.git",' +
      ` received "${repository}"`,
  )
  return
}

const FILE_PROTOCOL = 'file:///'
const GIT_SCHEMA = 'git@'
const DEFAULT_START_FILE = 'README.md'
export function parseParams(params: URLSearchParams) {
  try {
    const fileToOpen = Uri.parse(params.get('fileToOpen') || DEFAULT_START_FILE)
      .toString()
      .replace(FILE_PROTOCOL, '')
    let repository = params.get('repository')
    const cell = params.get('cell')

    if (repository) {
      repository = (
        repository.startsWith(GIT_SCHEMA)
          ? GIT_SCHEMA + Uri.parse(repository.slice(GIT_SCHEMA.length)).toString()
          : Uri.parse(repository).toString()
      ).replace(FILE_PROTOCOL, '')
    }

    if (cell) {
      return { fileToOpen, repository, cell: Number(cell) }
    }
    return { fileToOpen, repository, cell: -1 }
  } catch (err) {
    throw new Error(`Failed to parse url parameters: ${(err as Error).message}`)
  }
}

export async function executeActiveNotebookCell({
  cell,
  kernel,
}: {
  cell: number
  kernel: Kernel
}) {
  const notebookDocument = window.activeNotebookEditor?.notebook
  if (!notebookDocument || notebookDocument.notebookType !== Kernel.type) {
    return
  }
  if (notebookDocument) {
    const cells = notebookDocument.getCells().filter((cell) => cell.kind === NotebookCellKind.Code)

    if (!cells.length || Number.isNaN(cell)) {
      return window.showErrorMessage('Could not find a valid code cell to execute')
    }

    const cellToExecute = cells[cell]
    if (!cellToExecute) {
      throw new Error(`Could not find cell at index ${cell}`)
    }
    return kernel.executeAndFocusNotebookCell(cellToExecute)
  }
}

export async function focusActiveNotebookCell({ cell, kernel }: { cell: number; kernel: Kernel }) {
  const notebookDocument = window.activeNotebookEditor?.notebook
  if (!notebookDocument || notebookDocument.notebookType !== Kernel.type) {
    return
  }
  if (notebookDocument) {
    const cells = notebookDocument.getCells().filter((cell) => cell.kind === NotebookCellKind.Code)

    if (!cells.length || Number.isNaN(cell)) {
      return window.showErrorMessage('Could not find a valid code cell to focus')
    }

    const cellToFocus = cells[cell]
    if (!cellToFocus) {
      throw new Error(`Could not find cell at index ${cell}`)
    }
    return kernel.focusNotebookCell(cellToFocus)
  }
}

export async function setCurrentCellForBootFile(
  context: ExtensionContext,
  { cell, focus = true, execute = false }: { cell: number; focus: boolean; execute: boolean },
) {
  if (!Number.isFinite(cell)) {
    return
  }
  if (focus) {
    await context.globalState.update(FOCUS_CELL_STORAGE_KEY, cell)
  }
  if (execute) {
    await context.globalState.update(EXECUTION_CELL_STORAGE_KEY, cell)
  }
  await context.globalState.update(CELL_CREATION_DATE_STORAGE_KEY, new Date())
}

export function shouldFocusCell(context: ExtensionContext): boolean {
  const cell = context.globalState.get<number>(FOCUS_CELL_STORAGE_KEY)
  const creationDate = context.globalState.get<string>(CELL_CREATION_DATE_STORAGE_KEY)
  if (typeof cell === 'number' && cell >= 0 && creationDate) {
    const timeStampDiff =
      Math.abs(new Date().getTime() - new Date(creationDate).getTime()) / (1000 * 60)
    // Max diff of 5 minutes to focus a cell
    return timeStampDiff <= 5
  }
  return false
}

export function shouldExecuteCell(context: ExtensionContext): boolean {
  const cell = context.globalState.get<number>(EXECUTION_CELL_STORAGE_KEY)
  const creationDate = context.globalState.get<string>(CELL_CREATION_DATE_STORAGE_KEY)
  if (typeof cell === 'number' && cell >= 0 && creationDate) {
    const timeStampDiff =
      Math.abs(new Date().getTime() - new Date(creationDate).getTime()) / (1000 * 60)
    // Max diff of 5 minutes to execute a cell
    return timeStampDiff <= 5
  }
  return false
}

export async function cleanExecutionForBootFile(context: ExtensionContext) {
  await context.globalState.update(FOCUS_CELL_STORAGE_KEY, undefined)
  await context.globalState.update(EXECUTION_CELL_STORAGE_KEY, undefined)
  await context.globalState.update(CELL_CREATION_DATE_STORAGE_KEY, undefined)
}

export function createBootFileRunnerWatcher(context: ExtensionContext, kernel: Kernel) {
  const fileWatcher = workspace.createFileSystemWatcher(`**/*${BOOTFILE_DEMO}`)
  return fileWatcher.onDidCreate(async (uri: Uri) => {
    for (let i = 0; i < 50; i++) {
      // avoid race condition due to IO being slow
      const exists = await fsExists(uri)
      if (exists) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const bootFile = new TextDecoder().decode(await workspace.fs.readFile(uri))
    const [fileName, cell] = bootFile.split('#')
    const notebookUri = Uri.file(uri.path.replace(BOOTFILE_DEMO, fileName))
    await workspace.fs.delete(uri)
    const activeDocument = window.activeNotebookEditor
    if (activeDocument?.notebook && activeDocument.notebook.uri.path === notebookUri.path) {
      await executeActiveNotebookCell({
        cell: Number(cell),
        kernel,
      })
    } else {
      await setCurrentCellForBootFile(context, { cell: Number(cell), focus: true, execute: true })
      await commands.executeCommand('vscode.openWith', notebookUri, Kernel.type)
    }
  })
}

export function createBootFileRunnerForActiveNotebook(context: ExtensionContext, kernel: Kernel) {
  return window.onDidChangeActiveNotebookEditor(async () => {
    if (shouldFocusCell(context)) {
      const focusCell = context.globalState.get<number>(FOCUS_CELL_STORAGE_KEY)
      await focusActiveNotebookCell({
        cell: focusCell!,
        kernel,
      })
      await cleanExecutionForBootFile(context)
      return
    }

    if (!shouldExecuteCell(context)) {
      return
    }
    const execCell = context.globalState.get<number>(EXECUTION_CELL_STORAGE_KEY)
    await executeActiveNotebookCell({
      cell: execCell!,
      kernel,
    })

    await cleanExecutionForBootFile(context)
  })
}
