import { getHTMLTemplate, parseCode } from '../utils'

export default function (code: string, filename: string) {
  const { scriptSection, htmlSection } = parseCode(code)

  const tsx = /*tsx*/`
    import { render } from 'https://esm.sh/preact@10.11.1'

    ${scriptSection}

    render(${htmlSection}, document.getElementById('root'))
  `
  const html = getHTMLTemplate(/*html*/`
    <div id="root"></div>
    <script type="module" src="/_notebook/${filename}.tsx"></script>
  `)

  return { html, tsx }
}
