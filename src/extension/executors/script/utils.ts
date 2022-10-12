import fs from 'node:fs'
import path from 'node:path'

const tw = fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'tw.min.css')).toString()

export function getHTMLTemplate (htmlSection: string, codeSection = '', attributes: Record<string, string>) {
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
      ${codeSection
        ? /*html*/`<script type="module">${codeSection}</script>`
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
