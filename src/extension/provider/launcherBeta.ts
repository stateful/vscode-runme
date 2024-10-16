import { basename, dirname } from 'node:path'

import {
  workspace,
  Disposable,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  CancellationTokenSource,
  NotebookData,
  NotebookCell,
  NotebookCellData,
  commands,
  window,
} from 'vscode'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ServerStreamingCall } from '@protobuf-ts/runtime-rpc'
import {
  firstValueFrom,
  from,
  isObservable,
  lastValueFrom,
  map,
  Observable,
  of,
  toArray,
} from 'rxjs'

import { initProjectClient, ProjectServiceClient, ReadyPromise } from '../grpc/client'
import KernelServer from '../server/kernelServer'
import { LoadEventFoundTask, LoadRequest, LoadResponse } from '../grpc/projectTypes'
import { Serializer } from '../../types'
import { RunmeIdentity } from '../grpc/serializerTypes'
import { asWorkspaceRelativePath, getAnnotations } from '../utils'
import { Kernel } from '../kernel'
import type { IRunner } from '../runner'
import getLogger from '../logger'
import { SerializerBase } from '../serializer'
import { runCellWithPrompts } from '../commands'

import { OpenFileOptions, RunmeFile, RunmeTreeProvider } from './launcher'

export const GLOB_PATTERN = '**/*.{md,mdr,mdx}'
const logger = getLogger('LauncherBeta')

type LoadStream = ServerStreamingCall<LoadRequest, LoadResponse>

type ProjectTask = LoadEventFoundTask

type TaskNotebook = NotebookData | Serializer.Notebook

type TaskCell = NotebookCell | NotebookCellData | Serializer.Cell

export class RunmeLauncherProvider implements RunmeTreeProvider {
  #disposables: Disposable[] = []
  private _includeAllTasks = false
  private tasks: Promise<ProjectTask[]>
  private ready: ReadyPromise
  private client: ProjectServiceClient | undefined
  private serverReadyListener: Disposable | undefined

  constructor(
    private kernel: Kernel,
    private server: KernelServer,
    private serializer: SerializerBase,
    private workspaceRoot?: string | undefined,
    private runner?: IRunner,
  ) {
    const watcher = workspace.createFileSystemWatcher(GLOB_PATTERN, false, true, false)

    this.serverReadyListener = this.server.onTransportReady(({ transport }) =>
      this.initProjectClient(transport),
    )

    this.ready = new Promise((resolve) => {
      const disposable = server.onTransportReady(() => {
        disposable.dispose()
        resolve()
      })
    })

    this.tasks = lastValueFrom(this.loadProjectTasks())

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
      await runCellWithPrompts(notebookEditor.notebook.cellAt(cellIndex), this.kernel)
    }
  }

  public get includeAllTasks(): boolean {
    return this._includeAllTasks
  }

  async includeUnnamed() {
    this._includeAllTasks = true
    await commands.executeCommand(
      'setContext',
      'runme.launcher.includeUnnamed',
      this._includeAllTasks,
    )
  }

  async excludeUnnamed() {
    this._includeAllTasks = false
    await commands.executeCommand(
      'setContext',
      'runme.launcher.includeUnnamed',
      this._includeAllTasks,
    )
  }

  async collapseAll() {}

  async expandAll() {}

  getTreeItem(element: RunmeFile): TreeItem {
    return element
  }

  async getChildren(element?: RunmeFile | undefined): Promise<RunmeFile[]> {
    const allTasks = await this.tasks

    if (!element) {
      return Promise.resolve(await this.getParentElement(allTasks))
    }

    return Promise.resolve(await this.getChildrenNew(allTasks, element))
  }

  async getParentElement(tasks: LoadEventFoundTask[]): Promise<RunmeFile[]> {
    const foundTasks: RunmeFile[] = []
    let prevDir: string | undefined

    for (const task of tasks) {
      const { documentPath } = task
      const { outside, relativePath } = asWorkspaceRelativePath(documentPath)
      if (outside) {
        continue
      }

      if (prevDir === relativePath) {
        continue
      }

      prevDir = relativePath
      foundTasks.push(
        new RunmeFile(relativePath, {
          collapsibleState: TreeItemCollapsibleState.Expanded,
          lightIcon: 'icon.gif',
          darkIcon: 'icon.gif',
          contextValue: 'folder',
        }),
      )
    }

    return foundTasks
  }

  async getChildrenNew(tasks: LoadEventFoundTask[], element: RunmeFile): Promise<RunmeFile[]> {
    const foundTasks: RunmeFile[] = []

    let mdBuffer: Uint8Array
    let prevFile: string | undefined
    let notebook: Observable<NotebookData> | undefined

    for (const task of tasks) {
      const { documentPath, name, id } = task
      const { outside, relativePath } = asWorkspaceRelativePath(documentPath)
      if (outside) {
        continue
      }

      if (element.label !== relativePath) {
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
        notebook = from(this.serializer.deserializeNotebook(mdBuffer, token))
      }

      if (!notebook) {
        continue
      }

      const cell = notebook.pipe(
        map((n) => {
          return n.cells.find(
            (cell) => cell.metadata?.['id'] === id || cell.metadata?.['runme.dev/name'] === name,
          )!
        }),
      )

      const notebookish = !isObservable(notebook) ? of(notebook) : notebook
      const taskNotebook = await firstValueFrom<TaskNotebook>(notebookish as any)
      const cellish = !isObservable(cell) ? of(cell) : cell
      const taskCell = await firstValueFrom<TaskCell>(cellish as any)

      const { excludeFromRunAll } = getAnnotations(taskCell.metadata)
      const cellText = 'value' in taskCell ? taskCell.value : taskCell.document.getText()
      const languageId = ('languageId' in taskCell && taskCell.languageId) || 'sh'
      const cellIndex = taskNotebook.cells.findIndex(
        (cell) => cell.metadata?.['id'] === id || cell.metadata?.['runme.dev/name'] === name,
      )

      const lines = cellText.split('\n')
      const tooltip = lines.length > 3 ? [...lines.slice(0, 3), '...'].join('\n') : lines.join('\n')

      foundTasks.push(
        new RunmeFile(`${name}${!excludeFromRunAll ? '*' : ''}`, {
          description: `${lines.at(0)}`,
          tooltip: tooltip,
          resourceUri: Uri.parse(`${name}.${languageId}`),
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

  // Internal

  private async initProjectClient(transport?: GrpcTransport) {
    this.client = initProjectClient(transport ?? (await this.server.transport()))
  }

  protected loadProjectTasks(): Observable<ProjectTask[]> {
    if (!workspace.workspaceFolders?.length) {
      return of([])
    }

    const separator = workspace.workspaceFolders[0].uri.fsPath.indexOf('/') > -1 ? '/' : '\\'

    const requests = (workspace.workspaceFolders ?? []).map((folder) => {
      return <LoadRequest>{
        kind: {
          oneofKind: 'directory',
          directory: {
            path: workspace.asRelativePath(folder.uri),
            skipGitignore: false,
            ignoreFilePatterns: [],
            skipRepoLookupUpward: false,
          },
        },
        identity: RunmeIdentity.ALL,
      }
    })

    logger.info(`Walking ${requests.length} directories/repos...`)

    const task$ = new Observable<ProjectTask>((observer) => {
      this.ready.then(() =>
        Promise.all(
          requests.map((request) => {
            const session: LoadStream = this.client!.load(request)
            session.responses.onMessage((msg) => {
              if (msg.data.oneofKind !== 'foundTask') {
                return
              }
              observer.next(msg.data.foundTask)
            })
            return session
          }),
        ).then(() => {
          logger.info('Finished walk.')
          observer.complete()
        }),
      )
    })

    const dirProx = (pt: ProjectTask) => {
      const { relativePath, outside } = asWorkspaceRelativePath(pt.documentPath)
      const len = relativePath.split(separator).length
      if (outside) {
        return 100 * len
      }
      return len
    }

    return task$.pipe(
      toArray(),
      map((tasks) => tasks.sort((a, b) => dirProx(a) - dirProx(b))),
    )
  }
}
