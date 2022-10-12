import fs from 'node:fs/promises'
import path from 'node:path'

import { createServer, ViteDevServer, InlineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
// import preact from '@preact/preset-vite'

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

    const config: InlineConfig = {
      root: rootPath,
      server: { port },
      plugins: [
        cellResult({ projectRoot: rootPath })
      ]
    }

    const projectViteConfigPathJS = path.resolve(rootPath, 'vite.config.js')
    const projectViteConfigPathTS = path.resolve(rootPath, 'vite.config.ts')
    const hasViteConfig: string | false = await Promise.any([
      fs.access(projectViteConfigPathJS).then(() => projectViteConfigPathJS),
      fs.access(projectViteConfigPathTS).then(() => projectViteConfigPathTS)
    ]).catch(() => false)
    if (hasViteConfig) {
      console.log(`[Runme] project ${hasViteConfig} found`)
      config.configFile = hasViteConfig
    } else {
      console.log(`[Runme] no project ${hasViteConfig} found, using custom setup`)
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
