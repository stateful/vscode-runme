import { getHTMLTemplate } from './utils'

export default function (code: string, filename: string) {
  const lines = code.split('\n')
  const htmlStartsAt = lines.findIndex((l) => l.trim().startsWith('<'))
  const scriptSection = lines.slice(0, htmlStartsAt - 1).join('\n')
  const htmlSection = lines.slice(htmlStartsAt)

  const tsx = /*tsx*/`
    import React from 'react'
    import { createRoot } from 'react-dom/client'

    ${scriptSection}

    const { createElement, useState } = React
    const root = createRoot(document.getElementById('root'));
    root.render(${htmlSection.join('\n')})
  `
  const html = getHTMLTemplate(/*html*/`
    <div id="root"></div>
    <script type="module" src="/_notebook/${filename}.tsx"></script>
  `)

  return { html, tsx }
}
