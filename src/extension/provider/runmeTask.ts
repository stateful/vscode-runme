import {
  ExtensionContext,
  ProviderResult,
  Task,
  TaskProvider,
  Uri,
  workspace,
  TaskScope,
  TaskRevealKind,
  TaskPanelKind,
  CancellationToken,
  CustomExecution,
  NotebookCell,
  NotebookCellData,
  NotebookData,
  Disposable,
} from 'vscode'
import { ServerStreamingCall } from '@protobuf-ts/runtime-rpc'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import {
  Observable,
  of,
  from,
  map,
  firstValueFrom,
  isObservable,
  toArray,
  mergeMap,
  delayWhen,
  finalize,
} from 'rxjs'

import getLogger from '../logger'
import { asWorkspaceRelativePath, getAnnotations, getWorkspaceEnvs } from '../utils'
import { Serializer, RunmeTaskDefinition } from '../../types'
import { SerializerBase } from '../serializer'
import type { IRunner, RunProgramExecution, RunProgramOptions } from '../runner'
import { IRunnerEnvironment } from '../runner/environment'
import { getCellCwd, getCellProgram, getNotebookSkipPromptEnvSetting } from '../executors/utils'
import { Kernel } from '../kernel'
import KernelServer from '../server/kernelServer'
import { ProjectServiceClient, initProjectClient, type ReadyPromise } from '../grpc/client'
import { LoadEventFoundTask, LoadRequest, LoadResponse } from '../grpc/projectTypes'
import { RunmeIdentity } from '../grpc/serializerTypes'
import { resolveRunProgramExecution } from '../executors/runner'
import {
  CommandMode,
  ResolveProgramRequest_Mode,
  ResolveProgramRequest_ModeEnum,
} from '../grpc/runner/types'

import { RunmeTreeProvider } from './launcher'

type TaskOptions = Pick<RunmeTaskDefinition, 'closeTerminalOnSuccess' | 'isBackground' | 'cwd'>
const log = getLogger('RunmeTaskProvider')

export interface RunmeTask extends Task {
  definition: Required<RunmeTaskDefinition>
}

type LoadStream = ServerStreamingCall<LoadRequest, LoadResponse>

type ProjectTask = LoadEventFoundTask

type TaskNotebook = NotebookData | Serializer.Notebook

type TaskCell = NotebookCell | NotebookCellData | Serializer.Cell

type RunmeTaskOptions = {
  isNameGenerated?: boolean
  filePath: string
  command: string
  notebook: TaskNotebook | Observable<TaskNotebook>
  cell: TaskCell | Observable<TaskCell>
  options: TaskOptions
  runner: IRunner
  runnerEnv: IRunnerEnvironment | undefined
}

export class RunmeTaskProvider implements TaskProvider {
  static execCount = 0
  static id = 'runme'

  private ready: ReadyPromise
  private tasks: Promise<ProjectTask[]>
  private client: ProjectServiceClient | undefined
  private serverReadyListener: Disposable | undefined

  constructor(
    private context: ExtensionContext,
    private treeView: RunmeTreeProvider,
    private serializer: SerializerBase,
    private kernel: Kernel,
    private server: KernelServer,
    private runner?: IRunner,
  ) {
    this.serverReadyListener = this.server.onTransportReady(({ transport }) =>
      this.initProjectClient(transport),
    )

    this.ready = new Promise((resolve) => {
      const disposable = server.onTransportReady(() => {
        disposable.dispose()
        resolve()
      })
    })

    // returns this.tasks to conform to non-null
    this.tasks = this.refreshTasks()

    treeView.onDidRefresh(() => {
      this.refreshTasks()
    })
  }

  private async initProjectClient(transport?: GrpcTransport) {
    this.client = initProjectClient(transport ?? (await this.server.transport()))
  }

  public refreshTasks(): Promise<ProjectTask[]> {
    if (!workspace.workspaceFolders?.length) {
      return Promise.resolve([])
    }

    this.tasks = firstValueFrom(this.loadProjectTasks())

    return this.tasks
  }

  private loadProjectTasks(): Observable<ProjectTask[]> {
    if (!workspace.workspaceFolders?.length) {
      return of([])
    }

    const folders$ = of(workspace.workspaceFolders).pipe(
      mergeMap((folders) => {
        log.info(`Walking ${folders.length} directories/repos...`)
        return from(folders).pipe(
          map((folder) => {
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
          }),
        )
      }),
    )

    const task$ = folders$.pipe(
      delayWhen(() => from(this.ready)),
      mergeMap((folder) => {
        return new Observable<ProjectTask>((observer) => {
          const session: LoadStream = this.client!.load(folder)
          session.responses.onMessage((msg) => {
            if (msg.data.oneofKind !== 'foundTask') {
              return
            }
            observer.next(msg.data.foundTask)
          })
          session.responses.onError((err) => observer.error(err))
          session.responses.onComplete(() => observer.complete())
        }).pipe(
          finalize(() => {
            if (folder.kind.oneofKind !== 'directory') {
              return
            }
            log.info(`Finished walk ${folder.kind.directory.path}.`)
          }),
        )
      }),
    )

    const dirProx = RunmeTaskProvider.directoryPromximityComp()
    return task$.pipe(
      toArray(),
      map((tasks) =>
        tasks.sort((a, b) => {
          const delta = dirProx(a.documentPath) - dirProx(b.documentPath)
          if (delta === 0) {
            return a.documentPath.localeCompare(b.documentPath)
          }
          return delta
        }),
      ),
    )
  }

  public static directoryPromximityComp = () => {
    let separator = '/'
    if (!!workspace.workspaceFolders?.length) {
      separator = workspace.workspaceFolders[0].uri.fsPath.indexOf('/') > -1 ? '/' : '\\'
    }
    return function (path: string) {
      const { relativePath, outside } = asWorkspaceRelativePath(path)
      const len = relativePath.split(separator).length
      if (outside) {
        return 100 * len
      }
      return len
    }
  }

  public async provideTasks(token: CancellationToken): Promise<Task[]> {
    if (!this.runner) {
      log.error('Tasks only supported with gRPC runner enabled')
      return []
    }

    const runnerEnv = this.kernel?.getRunnerEnvironment()
    const all = await this.tasks
    const includeAllTasks = this.treeView.includeAllTasks

    try {
      const filtered = all.filter((prjTask) => {
        if (includeAllTasks) {
          return true
        }
        const { outside } = asWorkspaceRelativePath(prjTask.documentPath)
        return !prjTask.isNameGenerated && !outside
      })
      // show all if there isn't a single named task
      const listed = filtered.length > 0 ? filtered : all
      const runmeTasks = listed.map(
        async (prjTask) =>
          await RunmeTaskProvider.newRunmeProjectTask(
            prjTask,
            {},
            token,
            this.serializer,
            this.runner!,
            runnerEnv,
          ),
      )
      return Promise.all(runmeTasks)
    } catch (e) {
      console.error(e)
    }

    return Promise.resolve([])
  }

  public resolveTask(task: Task): ProviderResult<Task> {
    /**
     * ToDo(sebastian): Implement refresh.
     * This only occurs if the task is no longer known.
     * Likely a side effect that the markdown file was modified.
     */
    return task
  }

  static async newRunmeProjectTask(
    knownTask: Pick<ProjectTask, 'id' | 'name' | 'documentPath' | 'isNameGenerated'>,
    options: TaskOptions = {},
    token: CancellationToken,
    serializer: SerializerBase,
    runner: IRunner,
    runnerEnv?: IRunnerEnvironment,
  ): Promise<Task> {
    const { id, name, documentPath, isNameGenerated } = knownTask
    let mdBuffer: Uint8Array
    try {
      mdBuffer = await workspace.fs.readFile(Uri.parse(documentPath))
    } catch (err: any) {
      if (err.code !== 'FileNotFound') {
        log.error(`${err.message}`)
      }
      throw err
    }

    const notebook = from(serializer.deserializeNotebook(mdBuffer, token))
    const cell = notebook.pipe(
      map((n) => {
        return n.cells.find(
          (cell) => cell.metadata?.['id'] === id || cell.metadata?.['runme.dev/name'] === name,
        )!
      }),
    )

    return this.newRunmeTask({
      isNameGenerated: isNameGenerated,
      filePath: documentPath,
      command: name,
      notebook: notebook,
      cell: cell,
      options,
      runner,
      runnerEnv,
    })
  }

  static async newRunmeTask({
    isNameGenerated,
    filePath,
    command,
    notebook,
    cell,
    options = {},
    runner,
    runnerEnv,
  }: RunmeTaskOptions): Promise<Task> {
    const source = asWorkspaceRelativePath(filePath).relativePath
    const name = `${command}`

    const notebookish = !isObservable(notebook) ? of(notebook) : notebook
    const cellish = !isObservable(cell) ? of(cell) : cell

    const task = new Task(
      {
        type: 'runme',
        name,
        command: name,
        fileUri: Uri.file(filePath),
        isNameGenerated: isNameGenerated,
      },
      TaskScope.Workspace,
      name,
      source,
      new CustomExecution(async () => {
        const notebook = await firstValueFrom<TaskNotebook>(notebookish as any)
        const cell = await firstValueFrom<TaskCell>(cellish as any)

        const { interactive, background, promptEnv } = getAnnotations(cell.metadata)
        const isBackground = options.isBackground || background

        const skipPromptEnvDocumentLevel = getNotebookSkipPromptEnvSetting(notebook)
        const languageId = ('languageId' in cell && cell.languageId) || 'sh'

        const { SKIP_ALL } = ResolveProgramRequest_ModeEnum()
        const { programName, commandMode } = getCellProgram(cell, notebook, languageId)
        const promptMode = skipPromptEnvDocumentLevel === false ? promptEnv : SKIP_ALL
        const cellText = 'value' in cell ? cell.value : cell.document.getText()

        let envs: Record<string, string> = {}
        if (!runnerEnv) {
          envs = {
            ...(await getWorkspaceEnvs(Uri.file(filePath))),
          }
          Object.assign(envs, process.env)
        }

        // todo(sebastian): re-prompt the best solution here?
        const execution = await RunmeTaskProvider.resolveRunProgramExecutionWithRetry(
          runner,
          runnerEnv,
          envs,
          cellText,
          languageId,
          commandMode,
          promptMode,
        )

        const cwd = options.cwd || (await getCellCwd(cell, notebook, Uri.file(filePath)))
        const runOpts: RunProgramOptions = {
          commandMode,
          convertEol: true,
          cwd,
          runnerEnv: runnerEnv,
          envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
          exec: execution,
          languageId,
          programName,
          storeLastOutput: true,
          tty: interactive,
        }

        const program = await runner.createProgramSession(runOpts)

        program.registerTerminalWindow('vscode')
        program.setActiveTerminalWindow('vscode')

        task.isBackground = isBackground
        task.presentationOptions = {
          focus: true,
          // why doesn't this work with Silent?
          reveal: isBackground ? TaskRevealKind.Never : TaskRevealKind.Silent,
          panel: isBackground ? TaskPanelKind.Dedicated : TaskPanelKind.Shared,
        }

        return program
      }),
    )

    return task
  }

  static async resolveRunProgramExecutionWithRetry(
    runner: IRunner,
    runnerEnv: IRunnerEnvironment | undefined,
    envs: Record<string, string>,
    script: string,
    languageId: string,
    commandMode: CommandMode,
    promptMode: ResolveProgramRequest_Mode,
  ): Promise<RunProgramExecution> {
    try {
      return await resolveRunProgramExecution(
        runner,
        runnerEnv,
        envs,
        script,
        languageId,
        commandMode,
        promptMode,
      )
    } catch (err: unknown) {
      if (err instanceof Error) {
        log.error(err.message)
      }
      return RunmeTaskProvider.resolveRunProgramExecutionWithRetry(
        runner,
        runnerEnv,
        envs,
        script,
        languageId,
        commandMode,
        promptMode,
      )
    }
  }
}
