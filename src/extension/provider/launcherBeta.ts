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

import { RunmeFile, RunmeTreeProvider } from './launcher'

export const GLOB_PATTERN = '**/*.{md,mdr,mdx}'
const logger = getLogger('LauncherBeta')

type LoadStream = ServerStreamingCall<LoadRequest, LoadResponse>

type ProjectTask = LoadEventFoundTask

type _TaskNotebook = NotebookData | Serializer.Notebook

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
  getTreeItem(element: RunmeFile): TreeItem {
    return element
  }

  async getChildren(element?: RunmeFile | undefined): Promise<RunmeFile[]> {
    const allTasks = await this.tasks
    let foundTasks: RunmeFile[] = []

    foundTasks = await this.getChildrenNew(allTasks, element)

    return Promise.resolve(foundTasks)
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

  async getChildrenNew(
    tasks: LoadEventFoundTask[],
    _element?: RunmeFile | undefined,
  ): Promise<RunmeFile[]> {
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

      // const notebookish = !isObservable(notebook) ? of(notebook) : notebook
      const cellish = !isObservable(cell) ? of(cell) : cell
      // const taskNotebook = await firstValueFrom<TaskNotebook>(notebookish as any)
      const taskCell = await firstValueFrom<TaskCell>(cellish as any)
      const { excludeFromRunAll } = getAnnotations(taskCell.metadata)

      foundTasks.push(
        new RunmeFile(`${name}${!excludeFromRunAll ? '*' : ''}`, {
          relativePath: relativePath,
          tooltip: 'Click to open runme file',
          lightIcon: 'icon.gif',
          darkIcon: 'icon.gif',
          collapsibleState: TreeItemCollapsibleState.None,
          onSelectedCommand: {
            arguments: [{ file: basename(documentPath), folderPath: dirname(documentPath) }],
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
