import { LitElement, css, html } from 'lit'
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

    .annotation-container {
      padding: 1rem;
      border: 1px solid var(--vscode-focusBorder);
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      width: 94%;
    }

    .row {
      width: 100%;
    }

    .annotation-item::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .annotation-item::part(root) {
      background: transparent;
      border:none;
      color: var(--vscode-foreground);
    }

    .annotation-item::part(label) {
      color: var(--vscode-foreground);
    }

    .annotation-item::part(checked-indicator) {
      fill: var(--vscode-foreground);
    }
  `

  readonly #descriptions = new Map<string, string>([
    ['background', 'Run cell as background process (default: false)'],
    ['interactive', 'Run cell inside terminal to allow for interactive input (default: true)'],
    ['closeTerminalOnSuccess', 'Hide terminal after cell successful execution (default: true)'],
    ['mimeType', 'Cell\'s ouput content MIME type (default: text/plain)'],
    ['name', 'Cell\'s canonical name for easy referencing in the CLI (default: auto-generated)'],
  ])

  // Declare reactive properties
  @property({ type: Object, reflect: true })
  annotations?: NotebookCellAnnotations

  #desc(id: string): string {
    return this.#descriptions.get(id) || id
  }

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
        propVal[propName] = e.target.checked.toString()
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
      output: { annotations: prop },
    })
  }

  renderCheckbox(id: string, isChecked: boolean, isReadOnly: boolean) {
    return html`<vscode-checkbox
      id="${id}"
      @change="${this.#onChange}"
      checked="${isReadOnly ? true : isChecked}"
      @blur="${this.#onChange}"
      readonly=${isReadOnly}
      class="annotation-item"
      ><b>${id}</b>: ${this.#desc(id)}</vscode-checkbox
    >`
  }

  renderTextField(id: string, text: string, placeHolder: string = '') {
    return html`<vscode-text-field
      id="${id}"
      type="text"
      value="${text}"
      @change="${this.#onChange}"
      placeholder=${placeHolder}
      size="50"
      class="annotation-item"
    ><b>${id}: </b>${this.#desc(id)}</vscode-text-field>`
  }

  // Render the UI as a function of component state
  render() {
    if (!this.annotations) {
      return html`⚠️ Whoops! Something went wrong displaying the editing UI!`
    }

    const displayableAnnotations = Object.entries(this.annotations).filter(([k]) => k.indexOf('runme.dev/') < 0)

    const markup = displayableAnnotations.map(([key, value]) => {
      return html`<div class="row">
        ${when(
          typeof value === 'boolean',
          () => this.renderCheckbox(key, value, false),
          () => html``
        )}
        ${when(
          typeof value === 'string',
          () => this.renderTextField(key, value, key),
          () => html``
        )}
      </div>`
    })

    return html`<section class="annotation-container">${markup}</section>`
  }

  #reset() {
    throw new Error('not implemented yet')
  }
}
