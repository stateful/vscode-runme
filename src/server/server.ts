import { createServer, ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

import '@babel/plugin-transform-react-jsx-development'

import { cellResult } from './plugins'

export class ViteServer {
  #server: ViteDevServer
  private constructor(server: ViteDevServer) {
    this.#server = server
  }

  get port() {
    return this.#server.config.server.port
  }

  static async start(argv: string[]) {
    const yargv = await yargs(hideBin(argv)).options({
      port: { type: 'number', required: true },
      rootPath: { type: 'string', required: true }
    }).argv

    process.env.FAST_REFRESH = 'false'
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      configFile: false,
      root: yargv.rootPath,
      server: { port: yargv.port },
      plugins: [
        cellResult({ projectRoot: yargv.rootPath }),
        vue(),
        svelte(),
        react({
          fastRefresh: false
        })
      ]
    })

    await server.listen()
    console.log(`[Runme] Kernel server started successfuly on port ${yargv.port}, root path: ${yargv.rootPath}`)
    return new this(server)
  }

  dispose() {
    console.log('[Runme] shut down server')
    this.#server.close()
  }
}
