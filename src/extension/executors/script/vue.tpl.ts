export default function (code: string, filename: string) {
  const lines = code.split('\n')
  const htmlStartsAt = lines.findIndex((l) => l.trim().startsWith('<'))
  const scriptSection = lines.slice(0, htmlStartsAt - 1).join('\n')
  const htmlSection = lines.slice(htmlStartsAt).join('\n')

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
  const html = /*html*/`
    <html>
      <head>
        <style>
          html, body {
            padding: 0;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/_notebook/${filename}.tsx"></script>
      </body>
    </html>
  `

  return { html, vue, tsx }
}
