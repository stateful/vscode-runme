import vscode, { ExtensionContext } from 'vscode'

import type { ClientMessage } from '../types'
import { ClientMessages } from '../constants'
import { API } from '../utils/deno/api'

import executor from './executors'
import { ENV_STORE, DENO_ACCESS_TOKEN_KEY } from './constants'
import { resetEnv, getKey } from './utils'

import './wasm/wasm_exec.js'

export class Kernel implements vscode.Disposable {
  #disposables: vscode.Disposable[] = []
  #controller = vscode.notebooks.createNotebookController(
    'runme',
    'runme',
    'RUNME'
  )
  protected messaging = vscode.notebooks.createRendererMessaging('runme-renderer')

  constructor(protected context: ExtensionContext) {
    this.#controller.supportedLanguages = Object.keys(executor)
    this.#controller.supportsExecutionOrder = false
    this.#controller.description = 'Run your README.md'
    this.#controller.executeHandler = this._executeAll.bind(this)

    this.messaging.postMessage({ from: 'lernel' })
    this.#disposables.push(
      this.messaging.onDidReceiveMessage(this.#handleRendererMessage.bind(this))
    )
  }

  dispose () {
    resetEnv()
    this.#disposables.forEach((d) => d.dispose())
  }

  async #handleRendererMessage ({ message }: { message: ClientMessage<ClientMessages> }) {
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
    } else if (message.type === ClientMessages.infoMessage) {
      return vscode.window.showInformationMessage(message.output as string)
    } else if (message.type === ClientMessages.errorMessage) {
      return vscode.window.showInformationMessage(message.output as string)
    }

    console.log(`Unknown event type: ${message.type}`)
  }

  private async _executeAll(cells: vscode.NotebookCell[]) {
    for (const cell of cells) {
      await this._doExecuteCell(cell)
    }
  }

  private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
    const runningCell = await vscode.workspace.openTextDocument(cell.document.uri)
    const exec = this.#controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const execKey = getKey(runningCell)
    const successfulCellExecution = await executor[execKey].call(this, exec, runningCell)
    exec.end(successfulCellExecution)
  }
}
