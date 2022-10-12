import { createServer, ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import preact from '@preact/preset-vite'

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
      /**
       * Currently we inject a TailwindCSS file with all static classes
       * resulting in adding a 5mb assets. There is more work needed
       * to ensure TW can be setup for a certain root directory that
       * runs on Fresh.
       */
      // css: {
      //   postcss: {
      //     plugins: [
      //       /**
      //        * ToDo(Christian): make this optional based on directory structure
      //        * Also this needs special setup for Deno apps which have their own
      //        * integration.
      //        */
      //       tw({
      //         config: {
      //           selfURL: yargv.rootPath,
      //           content: ['./**/*.html'],
      //           safelist: [{
      //             pattern: /.*/,
      //             variants: []
      //           }]
      //         }
      //       })
      //     ],
      //   }
      // },
      plugins: [
        cellResult({ projectRoot: yargv.rootPath }),
        vue(),
        svelte(),
        react({
          fastRefresh: false
        }),
        preact()
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
