import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ClientMessages } from '../../constants'
import type { ClientMessage, CellAnnotations, CellAnnotationsErrorResult } from '../../types'
import { getContext } from '../utils'
import { CellAnnotationsSchema, AnnotationSchema } from '../../schema'
import '@vscode/webview-ui-toolkit/dist/data-grid/index'

type AnnotationsMutation = Partial<CellAnnotations>
type AnnotationsKey = keyof typeof AnnotationSchema
type Target = {
  target: {
    id: AnnotationsKey
    checked: boolean
    value: string
    type: string
  }
}

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

    .annotation-container h4 {
      margin-block: 0;
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

    .error-item {
      color: var(--vscode-errorForeground);
    }

    .has-errors, .error-container {
      border: solid 1px var(--vscode-errorForeground);
    }

    .error-container {
      padding:0.1rem;
    }

    .current-value-error {
      padding: 1rem;
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
  annotations?: CellAnnotations

  @property({ type: Object, reflect: true })
  validationErrors?: CellAnnotationsErrorResult

  #desc(id: string): string {
    return this.#descriptions.get(id) || id
  }

  #getTargetValue(e: Target) {
    switch (e.target.type) {
      case 'text':
        return e.target.value
      default:
        return e.target.checked.toString()
    }
  }


  #onChange(e: { target: { id: AnnotationsKey, checked: boolean, value: string, type: string } }) {
    if (!this.annotations || !e.target) {
      return
    }

    const propVal: any = { 'runme.dev/uuid': this.annotations['runme.dev/uuid'] }
    const propName = e.target.id
    const targetValue = this.#getTargetValue(e)

    const parseResult = CellAnnotationsSchema.safeParse({
      [propName]: targetValue
    })

    if (!parseResult.success) {
      const { fieldErrors } = parseResult.error.flatten()
      // TODO: Revisit this implementation to prevent mutating this object
      if (this.validationErrors && !this.validationErrors?.errors) {
        this.validationErrors.errors = {}
      }
      if (this.validationErrors?.errors && !this.validationErrors.errors[propName]) {
        this.validationErrors.errors[propName] = fieldErrors[propName]
      }
      // Re-render the form
      return this.requestUpdate()
    }

    if (this.validationErrors?.errors && this.validationErrors.errors[propName]) {
      delete this.validationErrors.errors[propName]
      this.requestUpdate()
    }

    switch (e.target.type) {
      case 'text':
        (this.annotations as any)[propName] = targetValue
        propVal[propName] = targetValue
        return this.#dispatch(propVal)
      default:
        (this.annotations as any)[e.target.id] = targetValue
        propVal[propName] = targetValue
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
      @keyup="${ this.#onChange}"
      placeholder=${placeHolder}
      size="50"
      class="annotation-item"
    ><b>${id}: </b>${this.#desc(id)}</vscode-text-field>`
  }

  renderErrors(errorMessages: string[]) {
    return html`<ul>
      ${errorMessages.map((error: string) => {
      return html`<li class="error-item">${error}</li>`
    })}
    </ul>`
  }

  renderCurrentValueError(value: string) {
    return html`<p class="error-item current-value-error">
      Received value: ${value}
      </p>`
  }

  // Render the UI as a function of component state
  render() {
    let errorCount = 0
    if (!this.annotations) {
      return html`⚠️ Whoops! Something went wrong displaying the editing UI!`
    }

    const displayableAnnotations = Object.entries(this.annotations).filter(([k]) => k.indexOf('runme.dev/') < 0)

    const markup = displayableAnnotations.map(([key, value]) => {
      const errors: string[] = this.validationErrors?.errors
        ? (this.validationErrors.errors[key as keyof CellAnnotations] || []) : []
      const originalValue = errors.length ?
        this.validationErrors?.originalAnnotations[key as keyof CellAnnotations] : value
      errorCount += errors.length
      return html`<div class="row ${errors.length ? 'error-container' : ''}">
        ${when(
        typeof value === 'boolean',
        () => this.renderCheckbox(key, value as boolean, false),
        () => html``
      )}
        ${when(
        typeof value === 'string',
        () => this.renderTextField(key, value as string, key),
        () => html``
      )}
      ${when(
        errors.length,
        () => this.renderErrors(errors),
        () => html``
      )}
      ${when(
        typeof value === 'boolean' && errors.length,
        () => this.renderCurrentValueError(originalValue as string),
        () => html``
      )}
      </div>`
    })

    return html`<section class="annotation-container ${errorCount ? 'has-errors' : ''}">
      <h4>Configure cell's execution behavior:</h4>
      ${markup}
      ${when(
      errorCount,
      () => html`<p class="error-item">This configuration block contains errors, using the default values instead</p>`,
      () => html``
    )}
    </section>`
  }

  #reset() {
    throw new Error('not implemented yet')
  }
}
