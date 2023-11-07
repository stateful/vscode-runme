import path from 'node:path'
import util from 'node:util'
import cp from 'node:child_process'
import os from 'node:os'

import { fetch } from 'cross-fetch'
import vscode, {
  FileType,
  Uri,
  workspace,
  env,
  window,
  Disposable,
  NotebookCell,
  NotebookCellExecution,
  NotebookCellOutput,
  commands,
  WorkspaceFolder,
  ExtensionContext,
  authentication,
} from 'vscode'
import { v5 as uuidv5 } from 'uuid'
import getPort from 'get-port'
import dotenv from 'dotenv'

import { CellAnnotations, CellAnnotationsErrorResult, RunmeTerminal, Serializer } from '../types'
import { SafeCellAnnotationsSchema, CellAnnotationsSchema } from '../schema'
import {
  AuthenticationProviders,
  NOTEBOOK_AVAILABLE_CATEGORIES,
  SERVER_ADDRESS,
  CATEGORY_SEPARATOR,
} from '../constants'
import {
  getEnvLoadWorkspaceFiles,
  getEnvWorkspaceFileOrder,
  getPortNumber,
  getTLSDir,
  getTLSEnabled,
} from '../utils/configuration'

import CategoryQuickPickItem from './quickPickItems/category'
import getLogger from './logger'
import { Kernel } from './kernel'
import { ENV_STORE, DEFAULT_ENV, BOOTFILE, BOOTFILE_DEMO } from './constants'
import { GrpcRunnerEnvironment } from './runner'
import RunmeServer from './server/runmeServer'
import { setCurrentCellExecutionDemo } from './handler/utils'

declare var globalThis: any

const log = getLogger()

/**
 * Annotations are stored as subset of metadata
 */
export function getAnnotations(cell: vscode.NotebookCell): CellAnnotations
export function getAnnotations(metadata?: Serializer.Metadata): CellAnnotations
export function getAnnotations(raw: unknown): CellAnnotations | undefined {
  const metadataFromCell = raw as vscode.NotebookCell
  let metadata = raw as Serializer.Metadata

  if (metadataFromCell.metadata) {
    metadata = metadataFromCell.metadata
  }

  const schema = {
    ...metadata,
    name: metadata.name || metadata['runme.dev/name'],
  }

  const parseResult = SafeCellAnnotationsSchema.safeParse(schema)
  if (parseResult.success) {
    return parseResult.data
  }
}

export function validateAnnotations(cell: NotebookCell): CellAnnotationsErrorResult {
  let metadata = cell as Serializer.Metadata

  if (cell.metadata) {
    metadata = cell.metadata
  }

  const schema = {
    ...metadata,
    name: metadata.name || metadata['runme.dev/name'],
  }

  const parseResult = CellAnnotationsSchema.safeParse(schema)
  if (!parseResult.success) {
    const { fieldErrors } = parseResult.error.flatten()
    return {
      hasErrors: true,
      errors: fieldErrors,
      originalAnnotations: schema as unknown as CellAnnotations,
    }
  }

  return {
    hasErrors: false,
    originalAnnotations: schema as unknown as CellAnnotations,
  }
}

export function getTerminalRunmeId(t: vscode.Terminal): string | undefined {
  return (
    (t.creationOptions as vscode.TerminalOptions).env?.RUNME_ID ??
    /\(RUNME_ID: (.*)\)$/.exec(t.name)?.[1] ??
    undefined
  )
}

export function getCellRunmeId(cell: vscode.NotebookCell) {
  return getCellUUID(cell)
}

function getCellUUID(cell: vscode.NotebookCell): string {
  if (cell.kind !== vscode.NotebookCellKind.Code) {
    throw new Error('Cannot get cell UUID for non-code cell!')
  }

  return getAnnotations(cell)['runme.dev/uuid']!
}

export function getTerminalByCell(cell: vscode.NotebookCell): RunmeTerminal | undefined {
  if (cell.kind !== vscode.NotebookCellKind.Code) {
    return undefined
  }

  const RUNME_ID = getCellRunmeId(cell)

  return vscode.window.terminals.find((t) => {
    return getTerminalRunmeId(t) === RUNME_ID
  }) as RunmeTerminal | undefined
}

export function resetEnv() {
  ;[...ENV_STORE.keys()].forEach((key) => ENV_STORE.delete(key))
  Object.entries(DEFAULT_ENV).map(([key, val]) => ENV_STORE.set(key, val))
}

export function isDenoScript(runningCell: vscode.TextDocument) {
  const text = runningCell.getText()
  return text.indexOf('deployctl deploy') > -1
}

export function isGitHubLink(runningCell: vscode.TextDocument) {
  const text = runningCell.getText()
  const isWorkflowUrl = text.includes('.github/workflows') || text.includes('actions/workflows')
  return text.startsWith('https://github.com') && isWorkflowUrl
}

export function getKey(runningCell: vscode.TextDocument): string {
  if (isDenoScript(runningCell)) {
    return 'deno'
  }

  if (isGitHubLink(runningCell)) {
    return 'github'
  }

  const { languageId } = runningCell

  if (languageId === 'shellscript') {
    return 'sh'
  }

  return languageId
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
  const workspaceFolder = vscode.workspace.workspaceFolders?.find((ws) =>
    fileDir.includes(ws.uri.fsPath),
  )

  if (!workspaceFolder) {
    return false
  }

  const hasGitDirectory = await vscode.workspace.fs.stat(workspaceFolder.uri).then(
    (stat) => stat.type === FileType.Directory,
    () => false,
  )
  if (!hasGitDirectory) {
    return false
  }

  const isCheckedIn = await util
    .promisify(cp.exec)(`git ls-files --error-unmatch ${filePath}`, {
      cwd: workspaceFolder.uri.fsPath,
    })
    .then(
      () => true,
      () => false,
    )
  return isCheckedIn
}

export async function initWasm(wasmUri: Uri) {
  const go = new globalThis.Go()
  const wasmFile = await workspace.fs.readFile(wasmUri)
  return WebAssembly.instantiate(wasmFile, go.importObject).then(
    (result) => {
      go.run(result.instance)
    },
    (err: Error) => {
      log.error(`failed initializing WASM file: ${err.message}`)
      return err
    },
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
    () => FileType.Unknown,
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
        if (firstChar === '.' || slashPlacement === '/') {
          return `**/${entry}**`
        }
        if (hasExtension || ['*', '#'].includes(firstChar)) {
          return
        }
        return `**/${entry}/**`
      }
    })
    .filter(Boolean)

  return [...new Set(entries)]
}

export function hashDocumentUri(uri: string): string {
  const salt = vscode.env.machineId
  const namespace = uuidv5(salt, uuidv5.URL)
  return uuidv5(uri, namespace).toString()
}

/**
 * Helper to workaround this bug: https://github.com/microsoft/vscode/issues/173577
 */
export function replaceOutput(
  exec: NotebookCellExecution,
  out: NotebookCellOutput | readonly NotebookCellOutput[],
  cell?: NotebookCell,
): Thenable<void> {
  exec.clearOutput()
  return exec.replaceOutput(out, cell)
}

export function getGrpcHost() {
  return `${SERVER_ADDRESS}:${getPortNumber()}`
}

export async function isPortAvailable(port: number): Promise<boolean> {
  return (await getPort({ port })) === port
}

export function processEnviron(): string[] {
  return Object.entries(process.env).map(([k, v]) => `${k}=${v || ''}`)
}

export function isWindows(): boolean {
  return os.platform().startsWith('win')
}

export async function openFileAsRunmeNotebook(uri: Uri): Promise<void> {
  return await commands.executeCommand('vscode.openWith', uri, Kernel.type)
}

/**
 * Replacement for `workspace.getWorkspaceFolder`, which has issues
 *
 * If `uri` is undefined, this returns the first (default) workspace folder
 */
export function getWorkspaceFolder(uri?: Uri): WorkspaceFolder | undefined {
  if (!uri) {
    return workspace.workspaceFolders?.[0]
  }

  let testPath = uri.fsPath
  do {
    for (const workspaceFolder of workspace.workspaceFolders ?? []) {
      if (testPath === workspaceFolder.uri.fsPath) {
        return workspaceFolder
      }
    }

    testPath = path.dirname(testPath)
  } while (testPath !== path.dirname(testPath))
}

// TODO: use gRPC project mode for this
export async function getWorkspaceEnvs(uri?: Uri): Promise<Record<string, string>> {
  const res: Record<string, string> = {}
  const workspaceFolder = getWorkspaceFolder(uri)

  if (!workspaceFolder || !getEnvLoadWorkspaceFiles()) {
    return res
  }

  const envFiles = getEnvWorkspaceFileOrder()

  const envs = await Promise.all(
    envFiles.map(async (fileName) => {
      const dotEnvFile = Uri.joinPath(workspaceFolder.uri, fileName)

      return await workspace.fs.stat(dotEnvFile).then(
        async (f) => {
          if (f.type !== FileType.File) {
            return {}
          }

          const bytes = await workspace.fs.readFile(dotEnvFile)
          return dotenv.parse(Buffer.from(bytes))
        },
        () => {
          return {}
        },
      )
    }),
  )

  for (const env of envs) {
    Object.assign(res, env)
  }

  return res
}

/**
 * Stores the specified unique notebook cell categories in the global state.
 * @param context
 * @param uri
 * @param categories
 */
export async function setNotebookCategories(
  context: ExtensionContext,
  uri: Uri,
  categories: Set<string>,
): Promise<void> {
  const notebooksCategoryState =
    context.globalState.get<string[]>(NOTEBOOK_AVAILABLE_CATEGORIES) || ({} as any)
  notebooksCategoryState[uri.path] = [...categories.values()]
  return context.globalState.update(NOTEBOOK_AVAILABLE_CATEGORIES, notebooksCategoryState)
}

/**
 * Get the notebook cell categories from the global state
 * @param context
 * @param uri
 * @returns
 */
export async function getNotebookCategories(
  context: ExtensionContext,
  uri: Uri,
): Promise<string[]> {
  const notebooksCategories = context.globalState.get<Record<string, string[]>>(
    NOTEBOOK_AVAILABLE_CATEGORIES,
  )
  if (!notebooksCategories) {
    return []
  }
  return notebooksCategories[uri.path] || []
}

/**
 * Get vscode machineID as UUID hashed using a namespace
 * @param namespace string to init UUID
 * @returns uuid as string
 */
export function getNamespacedMid(namespace: string) {
  const ns = uuidv5(namespace, uuidv5.URL)
  return uuidv5(env.machineId, ns)
}

/**
 * Opens a start-up file either defined within a `.runme_bootstrap` file or
 * set as Runme configuration.
 * It can also opens a start-up file and execute a specific cell via `.runme_bootstrap_demo`
 */
export async function bootFile(context: ExtensionContext) {
  if (!workspace.workspaceFolders?.length || !workspace.workspaceFolders[0]) {
    return
  }

  const startupFileUri = Uri.joinPath(workspace.workspaceFolders[0].uri, BOOTFILE)
  const runnableFileUri = Uri.joinPath(workspace.workspaceFolders[0].uri, BOOTFILE_DEMO)
  const hasStartupFile = await workspace.fs.stat(startupFileUri).then(
    () => true,
    () => false,
  )

  const hasRunnableFile = await workspace.fs.stat(runnableFileUri).then(
    () => true,
    () => false,
  )

  const fileUri = hasRunnableFile ? runnableFileUri : startupFileUri

  if (hasStartupFile || hasRunnableFile) {
    let bootFile = new TextDecoder().decode(await workspace.fs.readFile(fileUri))
    if (hasRunnableFile) {
      const [fileName, cell] = bootFile.split('#')
      bootFile = fileName
      await setCurrentCellExecutionDemo(context, Number(cell))
    }

    const bootFileUri = Uri.joinPath(workspace.workspaceFolders[0].uri, bootFile)
    await workspace.fs.delete(fileUri)
    log.info(`Open file defined in "${BOOTFILE}" file: ${bootFileUri.fsPath}`)
    return commands.executeCommand('vscode.openWith', bootFileUri, Kernel.type)
  }

  /**
   * if config is set, open file path directly
   */
  const config = workspace.getConfiguration('runme.flags')
  const startupFilePath = config.get<string | undefined>('startFile')
  if (!startupFilePath) {
    return
  }

  const startupFileUriConfig = Uri.joinPath(workspace.workspaceFolders[0].uri, startupFilePath)
  const hasStartupFileConfig = await workspace.fs.stat(startupFileUriConfig).then(
    () => true,
    () => false,
  )
  if (!hasStartupFileConfig) {
    return
  }

  log.info(`Open file defined in "runme.flag.startFile" setting: ${startupFileUriConfig.fsPath}`)
  return commands.executeCommand('vscode.openWith', startupFileUriConfig, Kernel.type)
}

export async function fileOrDirectoryExists(path: Uri): Promise<boolean> {
  return workspace.fs.stat(path).then(
    async (file) => {
      return file.type === FileType.File || file.type === FileType.Directory
    },
    () => false,
  )
}

export function isMultiRootWorkspace(): boolean {
  return (workspace.workspaceFolders && workspace.workspaceFolders.length > 1) || false
}

export function convertEnvList(envs: string[]): Record<string, string | undefined> {
  return envs.reduce(
    (prev, curr) => {
      const [key, value = ''] = curr.split(/\=(.*)/s)
      prev[key] = value

      return prev
    },
    {} as Record<string, string | undefined>,
  )
}

export function getAuthSession(createIfNone: boolean = true) {
  return authentication.getSession(AuthenticationProviders.GitHub, ['user:email'], {
    createIfNone,
  })
}

export function fetchStaticHtml(appUrl: string) {
  return fetch(appUrl)
}

export function getRunnerSessionEnvs(extensionBaseUri: Uri, kernel: Kernel, server: RunmeServer) {
  const envs: Record<string, string> = {}
  envs['RUNME_SERVER_ADDR'] = server.address()

  if (getTLSEnabled()) {
    envs['RUNME_TLS_DIR'] = getTLSDir(extensionBaseUri)
  }

  const runnerEnv = kernel.getRunnerEnvironment()
  if (runnerEnv && runnerEnv instanceof GrpcRunnerEnvironment) {
    envs['RUNME_SESSION'] = runnerEnv.getSessionId()
  }
  return envs
}

export function suggestCategories(categories: string[], title: string, placeholder: string) {
  const input = window.createQuickPick<CategoryQuickPickItem>()
  input.title = title
  input.placeholder = placeholder
  input.canSelectMany = true

  const origCategories = categories.map((val) => new CategoryQuickPickItem(val))
  input.items = origCategories
  input.show()

  const disposables = [
    input.onDidChangeValue((value) => {
      const isNewItem = categories.filter((c) => c.includes(value)).length === 0
      if (!isNewItem) {
        input.items = origCategories
        return
      }

      input.items = [
        ...input.items.filter((i) => !i.isNew()),
        new CategoryQuickPickItem(value, true),
      ]

      /**
       * auto select new category if label is valid
       */
      if (CategoryQuickPickItem.isValid(value)) {
        input.selectedItems = input.items.slice(-1)
      }
    }),
    input.onDidChangeSelection((items) => {
      if (items.length === 1 && !items[0].isValid()) {
        input.selectedItems = []
      }
    }),
  ]

  return new Promise<{ disposables: Disposable[]; answer: string }>((resolve) => {
    disposables.push(
      input.onDidAccept(() => {
        /**
         * validate new category label
         */
        if (input.selectedItems.length === 1 && !input.selectedItems[0].isValid()) {
          return
        }

        input.dispose()
        resolve({
          disposables,
          answer: input.selectedItems.map((qp) => qp.label).join(CATEGORY_SEPARATOR),
        })
      }),
    )
  })
}
