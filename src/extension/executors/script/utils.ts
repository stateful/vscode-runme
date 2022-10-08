export function getHTMLTemplate (htmlSection: string, codeSection = '') {
  return /*html*/`
  <html>
    <head>
      <title>Runme Component Example</title>
      <style>
        html, body {
          padding: 0;
          margin: 0;
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
  const scriptSection = lines.slice(0, htmlStartsAt - 1).join('\n')
  const htmlSection = lines.slice(htmlStartsAt).join('\n')

  return { scriptSection, htmlSection }
}
