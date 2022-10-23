import fs from 'node:fs'
import path from 'node:path'

const tw = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'tw.min.css')).toString()

interface TemplateProps {
  htmlSection?: string
  scriptSection?: string
  attributes: Record<string, string>
  filename: string
}

export function getHTMLTemplate ({ htmlSection, scriptSection, attributes, filename }: TemplateProps) {
  return /*html*/`
  <html>
    <head>
      <title>Runme Component Example</title>
      <style>
        html, body {
          padding: 0;
          margin: 0;
        }

        ${attributes.tailwindCSS
          ? `/* tailwindcss */\n${tw}`
          : ''
        }
      </style>
      <script type="module">
        const earlyMessages = []
        const socket = new WebSocket('ws://' + window.location.host + '/ws')
        const origConsole = {
          log: console.log.bind(console),
          error: console.error.bind(console),
          info: console.info.bind(console)
        }

        addEventListener('error', (event) => {
          const msg = {
            type: 'script:error',
            output: {
              type: event.type,
              message: event.message,
              filename: '${filename}'
            }
          }
          if (socket.readyState === 0) {
            earlyMessages.push(msg)
            return
          } else if (socket.readyState !== 1) {
            return
          }

          socket.send(JSON.stringify(msg))
        });

        function consoleHandler (type) {
          return (...args) => {
            const msg = {
              type: 'script:log',
              output: { type, args, filename: '${filename}' }
            }
            if (socket.readyState === 0) {
              earlyMessages.push(msg)
              return
            } else if (socket.readyState !== 1) {
              return
            }

            socket.send(JSON.stringify(msg))
            console.log(type)
            return origConsole[type](...args)
          }
        }

        console.log = consoleHandler('log')
        console.error = consoleHandler('error')
        console.warn = consoleHandler('warn')

        // Connection opened
        socket.addEventListener('open', () => {
          for (const earlyMessage of earlyMessages) {
            socket.send(JSON.stringify(earlyMessage))
          }

          const component = document.body.querySelector('*')
          if (!component) {
            return
          }
          const height = component.getBoundingClientRect().height
          socket.send(JSON.stringify({
            type: 'script:frameHeight',
            output: {
              height,
              filename: '${filename}'
            }
          }))
        })
      </script>
      ${scriptSection
        ? /*html*/`<script type="module">${scriptSection}</script>`
        : ''
      }
    </head>
    <body>
      ${htmlSection}
    </body>
  </html>
`
}

export function parseCode (code: string) {
  const lines = code.split('\n')
  const htmlStartsAt = lines.findIndex((l) => l.trim().startsWith('<'))

  if (htmlStartsAt < 0) {
    return { scriptSection: code, htmlSection: '' }
  }

  const scriptSection = lines.slice(0, htmlStartsAt).join('\n')
  const htmlSection = lines.slice(htmlStartsAt).join('\n')

  return { scriptSection, htmlSection }
}
