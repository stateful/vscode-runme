import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('vite-output')
export class ViteOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {}

    iframe {
      width: 100%;
      border: 0
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
        </head>
        <body>
          ${this.content}
        </body>
      </html>
    `)
    doc.close()
  }
}
