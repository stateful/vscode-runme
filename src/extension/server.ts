import path from 'node:path'
import cp, { ChildProcess } from 'node:child_process'

import getPort from 'get-port'
import vscode from 'vscode'

import { ServerMessages } from '../constants'
import { ServerMessagePayload, ServerMessage } from '../types'

type Listener<T extends ServerMessages> = (message: ServerMessagePayload[T]) => void

export class ViteServerProcess implements vscode.Disposable {
  #port?: number
  #process?: ChildProcess
  #rootPath = vscode.workspace.workspaceFolders![0].uri.fsPath
  #listeners = new Map<string, Listener<ServerMessages>[]>()

  get port() {
    return this.#port
  }

  get rootPath() {
    return this.#rootPath
  }

  async start() {
    const serverPath = path.join(__dirname, 'server', 'server.js')
    this.#port = await getPort()
    this.#process = cp.spawn('node', [serverPath, `--port=${this.#port}`, `--rootPath=${this.#rootPath}`], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })

    this.#process.stderr?.pipe(process.stderr)
    this.#process.stdout?.pipe(process.stdout)
    this.#process.on('message', this.#handleProcessMessage.bind(this))
  }

  #handleProcessMessage (message: any) {
    if (!message || !message.type) {
      return
    }
    const handlers = this.#listeners.get(message.type) || []
    for (const h of handlers) {
      h(message)
    }
  }

  stop() {
    if (this.#process) {
      this.#process.kill()
      this.#process = undefined
    }
  }

  emit <T extends ServerMessages>(eventName: ServerMessages, message: ServerMessagePayload[T]) {
    if (!this.#process) {
      throw new Error('Can\'t send message to server: server not running')
    }
    this.#process.send(<ServerMessage<T>>{ type: eventName, message })
  }

  on <T extends ServerMessages>(eventName: T, fn: Listener<ServerMessages>) {
    const registeredListeners = this.#listeners.get(eventName) || []
    this.#listeners.set(eventName, [...registeredListeners, fn])
  }

  dispose() {
    this.stop()
  }
}
