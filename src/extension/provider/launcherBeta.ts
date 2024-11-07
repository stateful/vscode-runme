import { basename, dirname } from 'node:path'

import {
  workspace,
  Disposable,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  CancellationTokenSource,
  NotebookData,
  commands,
  window,
  EventEmitter,
  tasks as vscodeTasks,
  Task,
} from 'vscode'

import { asWorkspaceRelativePath, getAnnotations } from '../utils'
import { Kernel } from '../kernel'
import getLogger from '../logger'
import { SerializerBase } from '../serializer'
import { LANGID_AND_EXTENSIONS } from '../../constants'

import { OpenFileOptions, RunmeFile, RunmeTreeProvider } from './launcher'

export const GLOB_PATTERN = '**/*.{md,mdr,mdx}'
const logger = getLogger('LauncherBeta')

/**
 * used to force VS Code update the tree view when user expands/collapses all
 * see https://github.com/microsoft/vscode/issues/172479
 */
/* eslint-disable-next-line */
let sauceCount = 0

export class RunmeLauncherProvider implements RunmeTreeProvider {
  #disposables: Disposable[] = []
  private allowUnnamed = false
  private defaultItemState = TreeItemCollapsibleState.Collapsed
  private _onDidChangeTreeData = new EventEmitter<RunmeFile | undefined>()

  constructor(
    private kernel: Kernel,
    private serializer: SerializerBase,
  ) {
    const watcher = workspace.createFileSystemWatcher(GLOB_PATTERN, false, true, false)

    this.#disposables.push(
      watcher.onDidCreate((file) => logger.info('onDidCreate: ', file.fsPath)),
      watcher.onDidDelete((file) => logger.info('onDidDelete: ', file.fsPath)),
    )
  }

  // RunmeTreeProvider
  async openFile({ file, folderPath, cellIndex }: OpenFileOptions) {
    const doc = Uri.file(`${folderPath}/${file}`)
    await commands.executeCommand('vscode.openWith', doc, Kernel.type)

    if (cellIndex === undefined) {
      return
    }

    const notebookEditor = window.visibleNotebookEditors.find((editor) => {
      return editor.notebook.uri.path === doc.path
    })

    if (notebookEditor && this.kernel) {
      await this.kernel.focusNotebookCell(notebookEditor.notebook.cellAt(cellIndex))
    }
  }

  public get includeAllTasks(): boolean {
    return this.allowUnnamed
  }

  async includeUnnamed() {
    this.allowUnnamed = true
    await commands.executeCommand('setContext', 'runme.launcher.includeUnnamed', this.allowUnnamed)
    this._onDidChangeTreeData.fire(undefined)
  }

  async excludeUnnamed() {
    this.allowUnnamed = false
    await commands.executeCommand('setContext', 'runme.launcher.includeUnnamed', this.allowUnnamed)
    this._onDidChangeTreeData.fire(undefined)
  }

  get onDidChangeTreeData() {
    return this._onDidChangeTreeData.event
  }

  async collapseAll() {
    this.defaultItemState = TreeItemCollapsibleState.Collapsed
    await commands.executeCommand('setContext', 'runme.launcher.isExpanded', false)
    this._onDidChangeTreeData.fire(undefined)
  }

  async expandAll() {
    this.defaultItemState = TreeItemCollapsibleState.Expanded
    await commands.executeCommand('setContext', 'runme.launcher.isExpanded', true)
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: RunmeFile): TreeItem {
    return element
  }

  async getChildren(element?: RunmeFile | undefined): Promise<RunmeFile[]> {
    const tasks = await vscodeTasks.fetchTasks({ type: 'runme' })

    if (!element) {
      /**
       * we need to tweak the folder name to force VS Code re-render the tree view
       * see https://github.com/microsoft/vscode/issues/172479
       */
      ++sauceCount
      return Promise.resolve(this.getNotebooks(tasks))
    }

    return Promise.resolve(await this.getCells(tasks, element))
  }

  getNotebooks(tasks: Task[]): RunmeFile[] {
    const foundTasks: RunmeFile[] = []
    let prevDir: string | undefined

    for (const task of tasks) {
      const { definition } = task
      const fileUri = definition.fileUri as Uri
      const documentPath = fileUri.path
      const { outside, relativePath } = asWorkspaceRelativePath(documentPath)

      if (outside) {
        continue
      }

      if (prevDir === relativePath) {
        continue
      }

      prevDir = relativePath
      foundTasks.push(
        new RunmeFile(`${relativePath}${sauceCount % 2 ? ' ' : ''}`, {
          collapsibleState: this.defaultItemState,
          lightIcon: 'tree-notebook.gif',
          darkIcon: 'tree-notebook.gif',
          contextValue: 'folder',
        }),
      )
    }

    return foundTasks
  }

  async getCells(tasks: Task[], element: RunmeFile): Promise<RunmeFile[]> {
    const foundTasks: RunmeFile[] = []

    let mdBuffer: Uint8Array
    let prevFile: string | undefined
    let notebook: NotebookData | undefined

    for (const task of tasks) {
      const {
        name,
        definition: { fileUri, isNameGenerated },
      } = task
      const documentPath = fileUri?.path
      const { outside, relativePath } = asWorkspaceRelativePath(documentPath)

      if (outside || (!this.allowUnnamed && isNameGenerated)) {
        continue
      }

      if (element.label.trimEnd() !== relativePath) {
        continue
      }

      if (prevFile !== documentPath) {
        prevFile = documentPath

        try {
          mdBuffer = await workspace.fs.readFile(Uri.parse(documentPath))
        } catch (err: any) {
          if (err.code !== 'FileNotFound') {
            logger.error(`${err.message}`)
          }
          throw err
        }

        const token = new CancellationTokenSource().token
        notebook = await this.serializer.deserializeNotebook(mdBuffer, token)
      }

      if (!notebook) {
        continue
      }

      const cell = notebook.cells.find((cell) => cell.metadata?.['runme.dev/name'] === name)!

      const { excludeFromRunAll } = getAnnotations(cell.metadata)
      const cellText = 'value' in cell ? cell.value : ''
      const languageId = ('languageId' in cell && cell.languageId) || 'sh'
      const cellIndex = notebook.cells.findIndex(
        (cell) => cell.metadata?.['runme.dev/name'] === name,
      )

      const lines = cellText.split('\n')
      const tooltip = lines.length > 3 ? [...lines.slice(0, 3), '...'].join('\n') : lines.join('\n')

      foundTasks.push(
        new RunmeFile(`${name}${!excludeFromRunAll ? '*' : ''}`, {
          description: `${lines.at(0)}`,
          tooltip: tooltip,
          resourceUri: Uri.parse(`${name}.${this.resolveExtension(languageId)}`),
          collapsibleState: TreeItemCollapsibleState.None,
          onSelectedCommand: {
            arguments: [
              {
                file: basename(documentPath),
                folderPath: dirname(documentPath),
                cellIndex: cellIndex,
              },
            ],
            command: 'runme.openRunmeFile',
            title: name,
          },
          contextValue: 'markdown-file',
        }),
      )
    }

    return Promise.resolve(foundTasks)
  }

  dispose() {
    this.#disposables.forEach((d) => d.dispose())
  }

  resolveExtension(languageId: string): string {
    const key = languageId.toLowerCase()
    return LANGID_AND_EXTENSIONS.get(key) || languageId
  }
}
