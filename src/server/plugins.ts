import fs from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'

import type { Plugin } from 'vite'

import { ServerMessages } from '../constants'
import type { ServerMessage } from '../types'

const EXTERNAL_DEPENDENCIES = [
  'react/jsx-dev-runtime',
  'preact/hooks',
  'react', 'react-dom/client',
  'svelte/internal'
]
const SVELTE_HMR_DEPS = [
  'runtime/hot-api-esm.js',
  'runtime/proxy-adapter-dom.js',
  'runtime/svelte-hooks.js'
]

const virtualFS = new Map<string, string>()

export function cellResult (options: { projectRoot: string }): Plugin {
  process.on('message', (message: ServerMessage<ServerMessages>) => {
    if (message.type === ServerMessages.renderFile) {
      const msg = message as ServerMessage<ServerMessages.renderFile>
      virtualFS.set(`${msg.message.filename}.${msg.message.ext}`, msg.message.src)
    }
  })

  return {
    name: 'notebookCellResult',
    enforce: 'pre',
    async resolveId (id) {
      if (EXTERNAL_DEPENDENCIES.includes(id)) {
        return `https://esm.sh/${id}`
      }

      for (const dep of SVELTE_HMR_DEPS) {
        if (id.endsWith(dep)) {
          return `https://esm.sh/svelte-hmr@0.15.0/${dep}`
        }
      }

      const modulePath = path.resolve(options.projectRoot, id)
      const hasAccess = await fs.access(modulePath).then(() => true, () => false)
      if (hasAccess) {
        return modulePath
      }
    },
    async load (scriptUrl) {
      if (scriptUrl.startsWith('/_notebook')) {
        const filename = path.parse(scriptUrl).base
        console.log(`[Runme] serve virtual file ${filename}`)
        return virtualFS.get(filename)
      }
    },
    configureServer (server) {
      return () => {
        server.middlewares.use('/', async (req, res, next) => {
          if (!req.url) {
            return
          }

          const urlParsed = url.parse(req.url)
          // if request is not html , directly return next()
          if (!urlParsed.pathname || !urlParsed.path || !urlParsed.pathname.endsWith('.html')) {
            return next()
          }

          const file = virtualFS.get(req.url.slice(1))
          if (!file) {
            return next()
          }

          console.log(`[Runme] serve custom file template for ${req.url}`)
          res.end(await server.transformIndexHtml(`${req.url}`, file))
          next()
        })
      }
    }
  }
}
