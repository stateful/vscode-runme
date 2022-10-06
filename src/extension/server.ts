import path from 'node:path'
import cp, { ChildProcess } from 'node:child_process'

import getPort from 'get-port'
import vscode from 'vscode'

export class ViteServerProcess implements vscode.Disposable {
  #port?: number
  #process?: ChildProcess
  #rootPath = vscode.workspace.workspaceFolders![0].uri.path

  get port () {
    return this.#port
  }

  get rootPath () {
    return this.#rootPath
  }

  async start () {
    const serverPath = path.join(__dirname, 'server', 'server.js')
    this.#port = await getPort()
    this.#process = cp.spawn('node', [serverPath, `--port=${this.#port}`, `--rootPath=${this.#rootPath}`], {
      shell: true
    })

    this.#process.stderr?.pipe(process.stderr)
    this.#process.stdout?.pipe(process.stdout)
  }

  stop () {
    if (this.#process) {
      this.#process.kill()
      this.#process = undefined
    }
  }

  dispose() {
      this.stop()
  }
}
