import path from 'node:path'

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
import { Observable, of, scan, takeLast, lastValueFrom } from 'rxjs'

import getLogger from '../logger'
import { getAnnotations, getWorkspaceEnvs } from '../utils'
import { Serializer, RunmeTaskDefinition } from '../../types'
import { SerializerBase } from '../serializer'
import type { IRunner, IRunnerEnvironment, RunProgramOptions } from '../runner'
import { getCellCwd, getCellProgram, parseCommandSeq } from '../executors/utils'
import { Kernel } from '../kernel'
import RunmeServer from '../server/runmeServer'
import { ProjectServiceClient, initProjectClient, type ReadyPromise } from '../grpc/client'
import { LoadEventFoundTask, LoadRequest, LoadResponse } from '../grpc/projectTypes'
import { RunmeIdentity } from '../grpc/serializerTypes'

import { RunmeLauncherProvider } from './launcher'

type TaskOptions = Pick<RunmeTaskDefinition, 'closeTerminalOnSuccess' | 'isBackground' | 'cwd'>
const log = getLogger('RunmeTaskProvider')

export interface RunmeTask extends Task {
  definition: Required<RunmeTaskDefinition>
}

type LoadStream = ServerStreamingCall<LoadRequest, LoadResponse>

type ProjectTask = LoadEventFoundTask

export class RunmeTaskProvider implements TaskProvider {
  static execCount = 0
  static id = 'runme'

  private ready: ReadyPromise
  private tasks: Promise<ProjectTask[]>
  private client: ProjectServiceClient | undefined
  private serverReadyListener: Disposable | undefined

  constructor(
    private context: ExtensionContext,
    private treeView: RunmeLauncherProvider,
    private serializer: SerializerBase,
    private kernel: Kernel,
    private server: RunmeServer,
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

    this.tasks = lastValueFrom(this.loadProjectTasks().pipe(takeLast(1)))
  }

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

    log.info(`Walking ${requests.length} directories/repos...`)

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
          log.info('Finished walk.')
          observer.complete()
        }),
      )
    })

    const dirProx = (pt: ProjectTask) => {
      return pt.documentPath.split(separator).length
    }

    return task$.pipe(
      scan((acc, one) => {
        acc.push(one)
        acc.sort((a, b) => dirProx(a) - dirProx(b))
        return acc
      }, new Array<ProjectTask>()),
    )
  }

  public async provideTasks(token: CancellationToken): Promise<Task[]> {
    if (!this.runner) {
      log.error('Tasks only supported with gRPC runner enabled')
      return []
    }

    const runnerEnv = this.kernel?.getRunnerEnvironment()
    const all = await this.tasks
    const includeGenerated = this.treeView.includeUnnamedTasks

    try {
      const filtered = all.filter((prjTask) => prjTask.isNameGenerated === includeGenerated)
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
    projectTask: ProjectTask,
    options: TaskOptions = {},
    token: CancellationToken,
    serializer: SerializerBase,
    runner: IRunner,
    runnerEnv?: IRunnerEnvironment,
  ): Promise<Task> {
    const { name, documentPath } = projectTask
    const source = path.basename(documentPath)

    const task = new Task(
      { type: 'runme', name, command: name },
      TaskScope.Workspace,
      name,
      source,
      new CustomExecution(async () => {
        let mdBuf: Uint8Array
        try {
          mdBuf = await workspace.fs.readFile(Uri.parse(documentPath))
        } catch (err: any) {
          if (err.code !== 'FileNotFound') {
            log.error(`${err.message}`)
          }
          throw err
        }

        const notebook = await serializer.deserializeNotebook(mdBuf, token)

        const cell: Serializer.Cell = notebook.cells.find((cell) => {
          return (
            cell.metadata?.['id'] === projectTask.id || cell.metadata?.['runme.dev/name'] === name
          )
        })!

        const { interactive, background, promptEnv } = getAnnotations(cell.metadata)

        const languageId = ('languageId' in cell && cell.languageId) || 'sh'
        const { programName, commandMode } = getCellProgram(cell, notebook, languageId)

        const cwd = options.cwd || (await getCellCwd(cell, notebook, Uri.file(documentPath)))

        const envs: Record<string, string> = {
          ...(await getWorkspaceEnvs(Uri.file(documentPath))),
        }

        const cellContent = cell.value
        const commands = await parseCommandSeq(
          cellContent,
          languageId,
          promptEnv,
          new Set([...(runnerEnv?.initialEnvs() ?? []), ...Object.keys(envs)]),
        )

        if (!runnerEnv) {
          Object.assign(envs, process.env)
        }

        const runOpts: RunProgramOptions = {
          commandMode,
          convertEol: true,
          cwd,
          runnerEnv: runnerEnv,
          envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
          exec: { type: 'commands', commands: commands ?? [''] },
          languageId,
          background,
          programName,
          storeLastOutput: true,
          tty: interactive,
        }

        const program = await runner.createProgramSession(runOpts)

        program.registerTerminalWindow('vscode')
        program.setActiveTerminalWindow('vscode')

        return program
      }),
    )

    return task
  }

  static async newRunmeTask(
    filePath: string,
    command: string,
    notebook: NotebookData | Serializer.Notebook,
    cell: NotebookCell | NotebookCellData | Serializer.Cell,
    options: TaskOptions = {},
    runner: IRunner,
    runnerEnv?: IRunnerEnvironment,
  ): Promise<Task> {
    const source = workspace.workspaceFolders?.[0]
      ? path.relative(workspace.workspaceFolders[0].uri.fsPath, filePath)
      : path.basename(filePath)

    const { interactive, background, promptEnv } = getAnnotations(cell.metadata)
    const isBackground = options.isBackground || background
    const languageId = ('languageId' in cell && cell.languageId) || 'sh'
    const { programName, commandMode } = getCellProgram(cell, notebook, languageId)

    const name = `${command}`

    const task = new Task(
      { type: 'runme', name, command: name },
      TaskScope.Workspace,
      name,
      source,
      new CustomExecution(async () => {
        const cwd = options.cwd || (await getCellCwd(cell, notebook, Uri.file(filePath)))

        const envs: Record<string, string> = {
          ...(await getWorkspaceEnvs(Uri.file(filePath))),
        }

        const cellContent = 'value' in cell ? cell.value : cell.document.getText()
        const commands = await parseCommandSeq(
          cellContent,
          languageId,
          promptEnv,
          new Set([...(runnerEnv?.initialEnvs() ?? []), ...Object.keys(envs)]),
        )

        if (!runnerEnv) {
          Object.assign(envs, process.env)
        }

        const runOpts: RunProgramOptions = {
          commandMode,
          convertEol: true,
          cwd,
          runnerEnv: runnerEnv,
          envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
          exec: { type: 'commands', commands: commands ?? [''] },
          languageId,
          programName,
          storeLastOutput: true,
          tty: interactive,
        }

        const program = await runner.createProgramSession(runOpts)

        program.registerTerminalWindow('vscode')
        program.setActiveTerminalWindow('vscode')

        return program
      }),
    )

    task.isBackground = isBackground
    task.presentationOptions = {
      focus: true,
      // why doesn't this work with Silent?
      reveal: isBackground ? TaskRevealKind.Never : TaskRevealKind.Always,
      panel: isBackground ? TaskPanelKind.Dedicated : TaskPanelKind.Shared,
    }

    return task
  }
}
