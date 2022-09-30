import { createServer, ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import getPort from 'get-port'
import vscode, { ExtensionContext } from 'vscode'

export class ViteServer implements vscode.Disposable {
  #server: ViteDevServer
  private constructor (server: ViteDevServer) {
    this.#server = server
  }

  get port ()  {
    return this.#server.config.server.port
  }

  static async create (context: ExtensionContext, port?: number) {
    const root = vscode.workspace.workspaceFolders![0].uri.path

    if (!port) {
      port = await getPort()
    }

    await context.globalState.update('viteServerPort', port)
    process.env.FAST_REFRESH = 'false'
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      configFile: false,
      root: root,
      server: { port },
      plugins: [
        vue()
      ]
    })

    await server.listen()
    console.log(`[Runme] Kernel server started successfuly on port ${port}`)
    return new this(server)
  }

  dispose() {
      this.#server.close()
  }
}
