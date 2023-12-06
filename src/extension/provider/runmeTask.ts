import path from 'node:path'

import {
  ExtensionContext,
  ProviderResult,
  Task,
  TaskProvider,
  Uri,
  workspace,
  window,
  TaskScope,
  TaskRevealKind,
  TaskPanelKind,
  NotebookCellKind,
  CancellationToken,
  CustomExecution,
  NotebookCell,
  NotebookCellData,
  NotebookData,
  Disposable,
} from 'vscode'
import { ServerStreamingCall } from '@protobuf-ts/runtime-rpc'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

import getLogger from '../logger'
import { getAnnotations, getWorkspaceEnvs } from '../utils'
import { Serializer, RunmeTaskDefinition } from '../../types'
import { SerializerBase } from '../serializer'
import type { IRunner, IRunnerEnvironment, RunProgramOptions } from '../runner'
import { getCellCwd, getCellProgram, parseCommandSeq } from '../executors/utils'
import { Kernel } from '../kernel'
import RunmeServer from '../server/runmeServer'
import { ProjectServiceClient, initProjectClient, type ReadyPromise } from '../grpc/client'
import { LoadRequest, LoadResponse } from '../grpc/projectTypes'
import { RunmeIdentity } from '../grpc/serializerTypes'

type TaskOptions = Pick<RunmeTaskDefinition, 'closeTerminalOnSuccess' | 'isBackground' | 'cwd'>
const log = getLogger('RunmeTaskProvider')

export interface RunmeTask extends Task {
  definition: Required<RunmeTaskDefinition>
}

type LoadStream = ServerStreamingCall<LoadRequest, LoadResponse>

export class RunmeTaskProvider implements TaskProvider {
  static execCount = 0
  static id = 'runme'

  private client: ProjectServiceClient | undefined
  private serverReadyListener: Disposable | undefined

  protected ready: ReadyPromise

  constructor(
    private context: ExtensionContext,
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

    this.loadProjects()
  }

  private async initProjectClient(transport?: GrpcTransport) {
    this.client = initProjectClient(transport ?? (await this.server.transport()))
  }

  protected async loadProjects() {
    await this.ready

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

    await Promise.all(
      requests.map((request) => {
        const session: LoadStream = this.client!.load(request)
        session.responses.onMessage((msg) => {
          if (msg.data.oneofKind !== 'foundTask') {
            return
          }
          console.log(msg.data.foundTask)
        })
        return session
      }),
    )

    log.info('Finished walk.')
  }

  public async provideTasks(token: CancellationToken): Promise<Task[]> {
    if (!this.runner) {
      log.error('Tasks only supported with gRPC runner enabled')
      return []
    }

    if (!this.client) {
      log.error('gRPC client not initialized')
      return []
    }

    const current =
      (window.activeNotebookEditor?.notebook.uri.fsPath.endsWith('md') &&
        window.activeNotebookEditor?.notebook.uri) ||
      (workspace.workspaceFolders?.[0].uri &&
        Uri.joinPath(workspace.workspaceFolders?.[0].uri, 'README.md'))

    if (!current) {
      return []
    }

    let mdContent: Uint8Array
    try {
      mdContent = await workspace.fs.readFile(current)
    } catch (err: any) {
      if (err.code !== 'FileNotFound') {
        log.error(`${err.message}`)
      }
      return []
    }

    const notebook = await this.serializer.deserializeNotebook(mdContent, token)

    const environment = this.kernel?.getRunnerEnvironment()

    return await Promise.all(
      notebook.cells
        .filter(
          (cell: Serializer.Cell): cell is Serializer.Cell => cell.kind === NotebookCellKind.Code,
        )
        .map(
          async (cell) =>
            await RunmeTaskProvider.newRunmeTask(
              current.fsPath,
              `${getAnnotations(cell.metadata).name}`,
              notebook,
              cell,
              {},
              this.runner!,
              environment,
            ),
        ),
    )
  }

  public resolveTask(task: Task): ProviderResult<Task> {
    /**
     * ToDo(Christian) fetch terminal from Kernel
     */
    return task
  }

  static async newRunmeTask(
    filePath: string,
    command: string,
    notebook: NotebookData | Serializer.Notebook,
    cell: NotebookCell | NotebookCellData | Serializer.Cell,
    options: TaskOptions = {},
    runner: IRunner,
    environment?: IRunnerEnvironment,
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
          new Set([...(environment?.initialEnvs() ?? []), ...Object.keys(envs)]),
        )

        if (!environment) {
          Object.assign(envs, process.env)
        }

        const runOpts: RunProgramOptions = {
          commandMode,
          convertEol: true,
          cwd,
          environment,
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
