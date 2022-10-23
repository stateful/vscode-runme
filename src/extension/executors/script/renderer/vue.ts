import { parseCode, getHTMLTemplate } from '../utils'

export default function (code: string, filename: string, attributes: Record<string, string>) {
  const { scriptSection, htmlSection } = parseCode(code)

  const vue = /*html*/`
    <script setup lang="ts">
    ${scriptSection}
    </script>
    <template>
    ${htmlSection}
    </template>
  `
  const tsx = /*tsx*/`
  import { createApp } from 'vue'
  import App from '${__dirname}/${filename}.vue'
  createApp(App).mount('#root')
  `

  const htmlToInject = /*html*/`
    <div id="root"></div>
    <script type="module" src="/_notebook/${filename}.tsx"></script>
  `
  const html = getHTMLTemplate({ htmlSection: htmlToInject, attributes, filename })
  return { html, vue, tsx }
}
