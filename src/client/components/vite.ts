import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

const ADJUSTMENT_TIMEOUT = 500 // 0.5s
const ADJUSTMENT_INTERVAL = 10

@customElement('vite-output')
export class ViteOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {}

    iframe {
      width: 100%;
      border: 0;
    }
  `

  // Declare reactive properties
  @property({ type: String })
  content?: string
  @property({ type: Number })
  port?: number

  // Render the UI as a function of component state
  render() {
    return html`<iframe src="about:blank"></iframe>`
  }

  protected firstUpdated() {
    const iframe = this.shadowRoot?.querySelector('iframe')
    if (!iframe) {
      return
    }

    const doc = iframe.contentWindow?.document!
    doc.open()
    doc.write(/*html*/`
      <html>
        <head>
          <title>Vite Output</title>
          <base href="http://127.0.0.1:${this.port}">
          <style>
            html, body {
              padding: 0;
              margin: 0;
            }
          </style>
          <script type="module">
            import RefreshRuntime from "/@react-refresh"
            RefreshRuntime.injectIntoGlobalHook(window)
            window.$RefreshReg$ = () => {}
            window.$RefreshSig$ = () => (type) => type
            window.__vite_plugin_react_preamble_installed__ = true
          </script>
        </head>
        <body>
          ${this.content}
        </body>
      </html>
    `)
    doc.close()

    /**
     * determine needed height for iframe
     */
    const anchor = document.createElement('a')
    anchor.style.display = 'block'
    doc.body.appendChild(anchor)

    const now = Date.now()
    const i: NodeJS.Timer = setInterval(() => {
      if ((Date.now() - now) > ADJUSTMENT_TIMEOUT) {
        return clearInterval(i)
      }

      const rect = anchor.getBoundingClientRect()
      if (rect.y === 0) {
        return
      }

      iframe.height = `${rect.y}px`
    }, ADJUSTMENT_INTERVAL)
  }
}
