/* eslint-disable @typescript-eslint/no-unused-vars */
import { LitElement, css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ClientMessages } from '../../constants'
import type { ClientMessage, NotebookCellAnnotations } from '../../types'
import { getContext } from '../utils'
import '@vscode/webview-ui-toolkit/dist/data-grid/index'

type AnnotationsMutation = Partial<NotebookCellAnnotations>
type AnnotationsKey = keyof NotebookCellAnnotations

@customElement('edit-annotations')
export class Annotations extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      display: block;
      font-family: Arial;
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
  @property({ type: Object, reflect: true })
  annotations?: NotebookCellAnnotations

  #onChange(e: { target: { id: AnnotationsKey, checked: boolean, value: string, type: string } }) {
    if (!this.annotations || !e.target) {
      return
    }

    const propVal: any = { 'runme.dev/uuid': this.annotations['runme.dev/uuid'] }
    const propName = e.target.id
    switch (e.target.type) {
      case 'text':
        (this.annotations as any)[propName] = e.target.value
        propVal[propName] = e.target.value
        return this.#dispatch(propVal)
      default:
        (this.annotations as any)[e.target.id] = e.target.checked.toString()
        propVal[propName] = e.target.checked
        return this.#dispatch(propVal)
    }
  }

  #dispatch(prop: AnnotationsMutation) {
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }

    ctx.postMessage(<ClientMessage<ClientMessages.mutateAnnotations>>{
      type: ClientMessages.mutateAnnotations,
      output: { annotations: prop }
    })
  }

  // Render the UI as a function of component state
  render() {
    // const supportsMessaging = Boolean(getContext().postMessage)
    if (!this.annotations) {
      return html`⚠️ Whoops! Something went wrong displaying the editing UI!`
    }

    const filtered = Object.entries(this.annotations).filter(
      ([k]) => k.indexOf('runme.dev/') < 0
    )

    const headers = filtered
      .map(([id, val], i) => {
        return html`<vscode-data-grid-cell
          cell-type="columnheader"
          grid-column="${i + 1}"
        >
          ${when(
            ['true', 'false'].includes(val.toString()),
            () => {
              return html`<vscode-checkbox
                id="${id}"
                @change="${this.#onChange}"
                checked="${val || nothing}"
              >
                ${id}
              </vscode-checkbox>`
            },
            () => {
              return html`<vscode-checkbox
                id="${id}"
                @change="${this.#onChange}"
                @blur="${this.#onChange}"
                checked
                readonly
              >
                ${id}</vscode-checkbox
              >`
            }
          )}
        </vscode-data-grid-cell>`
      })

    const annos = filtered.map(([key, val], i) => {
      return html`<vscode-data-grid-cell grid-column="${i + 1}">
        ${when(
          !['true', 'false'].includes(val.toString()),
          () => {
            return html`<vscode-text-field
              id="${key}"
              type="text"
              value="${val}"
              @change="${this.#onChange}"
            ></vscode-text-field>`
          },
          () => {
            return html``
          }
        )}
      </vscode-data-grid-cell>`
    })

    return html` <section id="data-grid-row">
      <vscode-data-grid
        class="basic-grid"
        generate-header="default"
        grid-template-columns="17% 17% 32% 17% 17%"
        aria-label="Cell Annotations"
      >
        <vscode-data-grid-row row-type="header">
          ${headers}
        </vscode-data-grid-row>
        <vscode-data-grid-row> ${annos} </vscode-data-grid-row>
      </vscode-data-grid>
    </section>`
  }

  #reset() {
    throw new Error('not implemented yet')
  }
}

function fromObjAttr(prop: string) {
  return function (value: string, type: object) {
    return JSON.parse(value)[prop]
  }
}
