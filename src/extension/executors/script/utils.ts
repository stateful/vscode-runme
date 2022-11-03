import { workspace, Uri } from 'vscode'

let tw: string

export function getHTMLTemplate (htmlSection: string, codeSection = '', attributes: Record<string, string>) {
  if (!tw) {
    tw = workspace.fs.readFile(Uri.joinPath(Uri.parse(__dirname), '..', 'assets', 'tw.min.css')).toString()
  }

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
