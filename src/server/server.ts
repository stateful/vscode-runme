import fs from 'node:fs/promises'
import path from 'node:path'

import { createServer, ViteDevServer, InlineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { hideBin } from 'yargs/helpers'
import { WebSocketServer } from 'ws'
import getPort from 'get-port'
import yargs from 'yargs'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
// import preact from '@preact/preset-vite'

import { ServerMessages } from '../constants'

import { cellResult } from './plugins'

export class ViteServer {
  #server: ViteDevServer
  private constructor(server: ViteDevServer) {
    this.#server = server
  }

  get port() {
    return this.#server.config.server.port
  }

  static async getStaticConfig(port: number, rootPath: string) {
    process.env.FAST_REFRESH = 'false'

    /**
     * start WS server to communicate data between cell view and server
     */
    const wsPort = await getPort()
    const wss = new WebSocketServer({ port: wsPort })
    wss.on('connection', function connection(ws) {
      ws.on('message', function message(data) {
        process.send!({ type: ServerMessages.wsEvent, message: data.toString() })
      })
    })

    const config: InlineConfig = {
      root: rootPath,
      server: {
        port,
        proxy: {
          '/ws': {
            target: `ws://localhost:${wsPort}`,
            ws: true
          }
        }
      },
      plugins: [
        cellResult({ projectRoot: rootPath })
      ]
    }

    const projectViteConfigPathJS = path.resolve(rootPath, 'vite.config.js')
    const projectViteConfigPathTS = path.resolve(rootPath, 'vite.config.ts')
    const viteConfigPath: string | false = await Promise.any([
      fs.access(projectViteConfigPathJS).then(() => projectViteConfigPathJS),
      fs.access(projectViteConfigPathTS).then(() => projectViteConfigPathTS)
    ]).catch(() => false)
    if (viteConfigPath) {
      console.log(`[Runme] project ${viteConfigPath} found`)
      config.configFile = viteConfigPath
    } else {
      console.log(`[Runme] no Vite project found at ${rootPath}, using custom setup`)
      config.plugins?.push(
        vue(),
        svelte({
          hot: false
        }),
        react({
          fastRefresh: false
        })
      )
    }

    return config
  }

  static async start(argv: string[]) {
    const yargv = await yargs(hideBin(argv)).options({
      port: { type: 'number', required: true },
      rootPath: { type: 'string', required: true }
    }).argv

    const config = await ViteServer.getStaticConfig(yargv.port, yargv.rootPath)
    const server = await createServer(config)

    await server.listen()
    console.log(`[Runme] Kernel server started successfuly on port ${yargv.port}, root path: ${yargv.rootPath}`)
    return new this(server)
  }

  dispose() {
    console.log('[Runme] shut down server')
    this.#server.close()
  }
}
