import url from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

import type { Plugin } from 'vite'
import { render } from 'eta'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const supportedTemplates = ['react']

export function cellResult (): Plugin {
  return {
    name: 'notebookCellResult',

    configureServer(server) {
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

          const type = path.parse(urlParsed.pathname || '').name
          if (!supportedTemplates.includes(type)) {
            return next()
          }

          const { code, ...components } = Object.fromEntries(
            new URLSearchParams(urlParsed.path.slice(urlParsed.path.indexOf('?')))
          )
          const htmlCode = render(
            (await fs.readFile(path.join(__dirname, 'templates', `${type}.html`))).toString(),
            { code, components }
          ) as string

          res.end(await server.transformIndexHtml(req.url, htmlCode))
          next()
        })
      }
    }
  }
}
