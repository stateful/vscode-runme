export default function (code: string, filename: string) {
  const lines = code.split('\n')
  const htmlStartsAt = lines.findIndex((l) => l.trim().startsWith('<'))
  const scriptSection = lines.slice(0, htmlStartsAt - 1).join('\n')
  const htmlSection = lines.slice(htmlStartsAt).join('\n')

  const svelte = /*html*/`
    <script lang="ts">
    ${scriptSection}
    </script>

    ${htmlSection}
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
        <script type="module">
          import App from '${__dirname}/${filename}.svelte'
          const app = new App({ target: document.getElementById('root') })
        </script>
      </body>
    </html>
  `

  return { html, svelte }
}
