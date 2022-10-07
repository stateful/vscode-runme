export default function (code: string, filename: string) {
  const lines = code.split('\n')
  const htmlStartsAt = lines.findIndex((l) => l.trim().startsWith('<'))
  const scriptSection = lines.slice(0, htmlStartsAt - 1).join('\n')
  const htmlSection = lines.slice(htmlStartsAt)

  const script = /*tsx*/`
    import React from 'react'
    import { createRoot } from 'react-dom/client'

    ${scriptSection}

    const { createElement, useState } = React
    const root = createRoot(document.getElementById('root'));
    root.render(${htmlSection.join('\n')})
  `
  const html = /*html*/`
    <html>
      <head>
        <style>
          html, body {
            padding: 0;
            margin: 0;
          }
        </style>
        <script type="module" src="/_notebook/${filename}.tsx"></script>
      </head>
      <body>
        <div id="root"></div>
        <script type="module">
          console.log('!!yoooo')
          window.addEventListener('load', () => setTimeout(() => {
            const msg = { type: 'view-scroll', value: document.body.scrollHeight }
            console.log('send it', msg)
            window.top.postMessage(msg, '*')
          }, 100))
        </script>
      </body>
    </html>
  `

  return [html, script]
}
