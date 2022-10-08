import { getHTMLTemplate, parseCode } from '../utils'

export default function (code: string, filename: string) {
  const { scriptSection, htmlSection } = parseCode(code)

  const tsx = /*tsx*/`
    import React from 'react'
    import { createRoot } from 'react-dom/client'

    ${scriptSection}

    const { createElement, useState } = React
    const root = createRoot(document.getElementById('root'));
    root.render(${htmlSection})
  `
  const html = getHTMLTemplate(/*html*/`
    <div id="root"></div>
    <script type="module" src="/_notebook/${filename}.tsx"></script>
  `)

  return { html, tsx }
}
