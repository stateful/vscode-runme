export function getHTMLTemplate (code: string) {
  return /*html*/`
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
      ${code}
    </body>
  </html>
`
}
