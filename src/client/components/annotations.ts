import { LitElement, css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

// import { ClientMessages } from '../../constants'
import type { NotebookCellMetadata } from '../../types'
// import { getContext } from '../utils'
import '@vscode/webview-ui-toolkit/dist/data-grid/index'

@customElement('edit-annotations')
export class Annotations extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      display: block;
      font-family: Arial
    }

    section {
      padding: 10px;
      border: 1px solid #444;
      border-radius: 5px;
      display: flex;
      flex-direction: row;
      gap: 50px;
      align-items: flex-start;
    }

    img {
      width: 100px;
      padding: 20px;
    }

    h4 {
      margin-bottom: 0;
    }
  `

  // Declare reactive properties
  @property({ type: Object })
  metadata?: NotebookCellMetadata

  // Render the UI as a function of component state
  render() {
    // const supportsMessaging = Boolean(getContext().postMessage)
    if (!this.metadata) {
      return html`⚠️ Whoops! Something went wrong displaying the editing UI!`
    }

    const headers = Object.entries(this.metadata).map(([key, val], i) => {
      return html`<vscode-data-grid-cell cell-type="columnheader" grid-column="${i + 1}">
        ${when(['true', 'false'].includes(val.toString()), () => {
          return html`<vscode-checkbox checked="${val || nothing}"> ${key}</vscode-checkbox>`
        }, () => {
          return html`<vscode-checkbox checked readonly> ${key}</vscode-checkbox>`
        })}
      </vscode-data-grid-cell>`
    })

    const annos = Object.entries(this.metadata).map(([, val], i) => {
      return html`<vscode-data-grid-cell grid-column="${i + 1}">
        ${when(!['true', 'false'].includes(val.toString()), () => {
          return html`<vscode-text-field
            type="text"
            value="${val}"
          ></vscode-text-field>`
        }, () => {
          return html``
        })}
      </vscode-data-grid-cell>`
    })

    return html`
    <section id="data-grid-row">
      <vscode-data-grid
        class="basic-grid"
        generate-header="default"
        grid-template-columns="17% 17% 32% 17% 17%"
        aria-label="Cell Annotations"
      >
        <vscode-data-grid-row row-type="header">
          ${ headers }
        </vscode-data-grid-row>
        <vscode-data-grid-row>
          ${ annos }
        </vscode-data-grid-row>
      </vscode-data-grid>
    </section>`
  }

  #reset () {
    throw new Error('not implemented yet')
  }
}
