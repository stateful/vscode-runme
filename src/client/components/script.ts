import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { ClientMessages } from '../../constants'
import { ClientMessage } from '../../types'
import { getContext } from '../utils'

@customElement('script-output')
export class ScriptOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {}

    iframe {
      width: 100%;
      border: 0;
    }
  `

  @property({ type: Number })
  port?: number
  @property({ type: String })
  filename?: string

  // Render the UI as a function of component state
  render() {
    if (!this.port || !this.filename) {
      return
    }
    return html`
      <iframe
        src="http://localhost:${this.port}/${this.filename}"
        style="width: 100%; border: 0; height: 0px;"
      ></iframe>
      <pre></pre>
    `
  }

  #onMessage (e: ClientMessage<ClientMessages>) {
    const pre = this.shadowRoot?.querySelector('pre')
    const iframe = this.shadowRoot?.querySelector('iframe')

    if ((e as ClientMessage<ClientMessages.scriptLog>).output.filename !== this.filename?.split('.')[0]) {
      return
    }


    if (pre && e.type === ClientMessages.scriptLog) {
      const payload = e.output as ClientMessage<ClientMessages.scriptLog>['output']
      pre.innerHTML += `[${payload.type}] ${payload.args.join(' ')}\n`
      return
    }

    if (pre && e.type === ClientMessages.scriptError) {
      const payload = e.output as ClientMessage<ClientMessages.scriptError>['output']
      pre.innerHTML += `[${payload.type}] ${payload.message}\n`
      return
    }

    if (iframe && e.type === ClientMessages.frameHeight) {
      const payload = e.output as ClientMessage<ClientMessages.frameHeight>['output']
      iframe.setAttribute('style', `width: 100%; border: 0; height: ${payload.height}px;`)
    }
  }

  protected firstUpdated() {
    const context = getContext()
    context.onDidReceiveMessage!(this.#onMessage.bind(this))
  }
}
