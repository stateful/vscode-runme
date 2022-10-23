import { getHTMLTemplate, parseCode } from '../utils'

export default function (code: string, filename: string, attributes: Record<string, string>) {
  const { scriptSection, htmlSection } = parseCode(code)

  const tsx = /*tsx*/`
    import React from 'https://esm.sh/react@18.2.0'
    import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client'

    ${scriptSection}

    const { createElement, useState } = React
    const root = createRoot(document.getElementById('root'));
    root.render(${htmlSection})
  `

  const htmlToInject = /*html*/`
    <div id="root"></div>
    <script type="module" src="/_notebook/${filename}.tsx"></script>
  `

  const html = getHTMLTemplate({ htmlSection: htmlToInject, attributes, filename })
  return { html, tsx }
}
