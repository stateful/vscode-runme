import fs from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'

import type { Plugin } from 'vite'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const extRoot = path.resolve(__dirname, '..', '..')

export function cellResult (): Plugin {
  return {
    name: 'notebookCellResult',
    enforce: 'pre',
    async load (scriptUrl) {
      if (scriptUrl.startsWith('/_notebook')) {
        const filename = path.parse(scriptUrl).base
        const templatePath = path.join(extRoot, 'out', filename)
        const hasAccess = await fs.access(templatePath).then(() => true, () => false)
        console.log(templatePath, hasAccess)

        if (!hasAccess) {
          return
        }

        const scriptFile = (await fs.readFile(templatePath, 'utf-8')).toString()
        return scriptFile
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

          const templatePath = path.join(extRoot, 'out', req.url.slice(1))
          const hasAccess = await fs.access(templatePath).then(() => true, () => false)

          if (!hasAccess) {
            return next()
          }

          const tpl = await fs.readFile(templatePath, 'utf-8')
          res.end(await server.transformIndexHtml(`${req.url}`, tpl))
          next()
        })
      }
    }
  }
}
