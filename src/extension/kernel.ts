import path from 'node:path'

import {
  Disposable, notebooks, window, workspace, ExtensionContext, NotebookEditor,
  NotebookCell, Task, TaskScope, ShellExecution, tasks, TaskExecution, NotebookDocument,
  TaskRevealKind
} from 'vscode'
import WebSocket from 'ws'
import getPort from 'get-port'

import type { ClientMessage } from '../types'
import { ClientMessages } from '../constants'
import { API } from '../utils/deno/api'

import executor from './executors'
import { ENV_STORE, DENO_ACCESS_TOKEN_KEY } from './constants'
import { resetEnv, getKey } from './utils'

import './wasm/wasm_exec.js'

export class Kernel implements Disposable {
  #files: string[] = []
  protected deamons: Map<string, { execution: TaskExecution, ws: WebSocket }> = new Map()
  #disposables: Disposable[] = []
  #controller = notebooks.createNotebookController(
    'runme',
    'runme',
    'RUNME'
  )
  protected messaging = notebooks.createRendererMessaging('runme-renderer')

  constructor(protected context: ExtensionContext) {
    this.#controller.supportedLanguages = Object.keys(executor)
    this.#controller.supportsExecutionOrder = false
    this.#controller.description = 'Run your README.md'
    this.#controller.executeHandler = this._executeAll.bind(this)

    this.messaging.postMessage({ from: 'lernel' })
    this.#disposables.push(
      this.messaging.onDidReceiveMessage(this.#handleRendererMessage.bind(this)),
      workspace.onDidOpenNotebookDocument(this.#startRunmeDeamon.bind(this)),
      workspace.onDidCloseNotebookDocument(this.#shutdownRunmeDeamon.bind(this))
    )
  }

  dispose () {
    resetEnv()
    this.#disposables.forEach((d) => d.dispose())
  }

  async #startRunmeDeamon (file: NotebookDocument) {
    console.log('File opened', file.uri.fsPath)
    if (this.#files.includes(file.uri.fsPath)) {
      return
    }
    this.#files.push(file.uri.fsPath)
    const port = await getPort()
    const replPath = path.resolve(this.context.extension.extensionUri.fsPath, 'repl.js')
    const taskExecution = new Task(
      { type: 'runme', name: `Runme Task (deamon on port ${port})` },
      TaskScope.Workspace,
      'Runme Deamon',
      'exec',
      new ShellExecution(`node ${replPath} ${port}`, {
        cwd: path.dirname(file.uri.fsPath),
        env: process.env as { [key: string]: string }
      })
    )
    taskExecution.presentationOptions = {
      focus: false,
      reveal: TaskRevealKind.Never
    }
    const execution = await tasks.executeTask(taskExecution)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const ws = new WebSocket(`ws://localhost:${port}`)
    this.deamons.set(file.uri.fsPath, { execution, ws })
    console.log(`Started new Runme deamon task on port ${port} for file ${file.uri.fsPath}`)
  }

  async #shutdownRunmeDeamon (file: NotebookDocument) {
    const deamon = this.deamons.get(file.uri.fsPath)
    if (!deamon) {
      return
    }
    deamon.ws.close()
    deamon.execution.terminate()
    this.#files.splice(this.#files.indexOf(file.uri.fsPath), 1)
  }

  // eslint-disable-next-line max-len
  async #handleRendererMessage({ editor, message }: { editor: NotebookEditor, message: ClientMessage<ClientMessages> }) {
    if (message.type === ClientMessages.promote) {
      const payload = message as ClientMessage<ClientMessages.promote>
      const token = ENV_STORE.get(DENO_ACCESS_TOKEN_KEY)
      if (!token) {
        return
      }

      const api = API.fromToken(token)
      const deployed = await api.promoteDeployment(payload.output.id, payload.output.productionDeployment)
      this.messaging.postMessage(<ClientMessage<ClientMessages.deployed>>{
        type: ClientMessages.deployed,
        output: deployed
      })
    } else if (message.type === ClientMessages.prod) {
      const payload = message as ClientMessage<ClientMessages.prod>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cell = editor.notebook.cellAt(payload.output.cellIndex)
      if (cell.executionSummary?.success) {
        process.env['vercelProd'] = 'true'
        return this._doExecuteCell(cell)
      }
    } else if (message.type === ClientMessages.infoMessage) {
      return window.showInformationMessage(message.output as string)
    } else if (message.type === ClientMessages.errorMessage) {
      return window.showInformationMessage(message.output as string)
    }

    console.error(`[Runme] Unknown event type: ${message.type}`)
  }

  private async _executeAll(cells: NotebookCell[]) {
    for (const cell of cells) {
      await this._doExecuteCell(cell)
    }
  }

  private async _doExecuteCell(cell: NotebookCell): Promise<void> {
    const runningCell = await workspace.openTextDocument(cell.document.uri)
    const exec = this.#controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const execKey = getKey(runningCell)
    const successfulCellExecution = await executor[execKey].call(this, exec, runningCell)
    exec.end(successfulCellExecution)
  }
}
