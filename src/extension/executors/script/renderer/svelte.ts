import { parseCode, getHTMLTemplate } from '../utils'

export default function (code: string, filename: string) {
  const { scriptSection, htmlSection } = parseCode(code)

  const svelte = /*html*/`
    <script lang="ts">
    ${scriptSection}
    </script>

    ${htmlSection}
  `
  const html = getHTMLTemplate(/*html*/`
    <div id="root"></div>
    <script type="module">
      import App from '${__dirname}/${filename}.svelte'
      const app = new App({ target: document.getElementById('root') })
    </script>
  `)

  return { html, svelte }
}
