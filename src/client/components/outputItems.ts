import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import '@vscode/webview-ui-toolkit/dist/button/index'

import { getContext } from '../utils'
import { COPY, TERMINAL, STOP } from '../icons'
import { ClientMessage, NotebookCellMetadata } from '../../types'
import { ClientMessages } from '../../constants'

@customElement('shell-output-items')
export class ShellOutputItems extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
  .output-items {
    display: flex;
    width: 101%;
    justify-content: flex-end;
  }
  vscode-button {
    background: transparent;
    color: #ccc;
    transform: scale(.9);
  }
  vscode-button:hover {
    background: var(--button-secondary-background);
  }
  vscode-button:focus {
    outline: #007fd4 1px solid;
  }
  .icon {
    width: 13px;
    margin: 0 5px 0 -5px;
    padding: 0;
  }
  `

  @property({ type: String })
  content = ''
  @property({ type: String })
  filePath = ''
  @property({ type: Number })
  pid: number | undefined
  @property({ type: Boolean })
  isRunning = false
  @property({ type: Object })
  metadata = {} as NotebookCellMetadata

  // Render the UI as a function of component state
  render() {
    return html`<section class="output-items">
      <vscode-button appearance="secondary" @click="${this.#copy}">
        ${COPY} Copy
      </vscode-button>
      ${when(this.pid, () => html`
        <vscode-button appearance="secondary" @click="${this.#openTerminal}">
          ${TERMINAL} &nbsp; Open Terminal (PID: ${this.pid})
        </vscode-button>
      `)}
      ${when(this.metadata.background && this.isRunning, () => html`
        <vscode-button appearance="secondary" @click="${this.#cancelTask}">
          ${STOP} &nbsp; Stop Task
        </vscode-button>
      `)}
    </section>`
  }

  #copy () {
    const ctx = getContext()

    if (!ctx.postMessage) {
      return
    }

    return navigator.clipboard.writeText(this.content).then(
      () => ctx.postMessage!(<ClientMessage<ClientMessages.infoMessage>>{
        type: ClientMessages.infoMessage,
        output: 'Copied result content to clipboard!'
      }),
      (err) => ctx.postMessage!(<ClientMessage<ClientMessages.errorMessage>>{
        type: ClientMessages.errorMessage,
        output: `'Failed to copy to clipboard: ${err.message}!'`
      })
    )
  }

  #openTerminal () {
    const ctx = getContext()

    if (!ctx.postMessage) {
      return
    }

    ctx.postMessage!(<ClientMessage<ClientMessages.openTerminal>>{
      type: ClientMessages.openTerminal,
      output: {
        filePath: this.filePath
      }
    })
  }

  #cancelTask () {
    const ctx = getContext()

    if (!ctx.postMessage) {
      return
    }

    ctx.postMessage!(<ClientMessage<ClientMessages.cancelTask>>{
      type: ClientMessages.cancelTask,
      output: {
        filePath: this.filePath
      }
    })
  }
}
