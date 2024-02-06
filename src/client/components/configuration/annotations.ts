import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import type { ClientMessage, CellAnnotations, CellAnnotationsErrorResult } from '../../../types'
import { CellAnnotationsSchema, AnnotationSchema } from '../../../schema'
import {
  ClientMessages,
  NOTEBOOK_AVAILABLE_CATEGORIES,
  OutputType,
  RENDERERS,
  CATEGORY_SEPARATOR,
} from '../../../constants'
import { closeOutput, getContext } from '../../utils'
import { postClientMessage, onClientMessage } from '../../../utils/messaging'
import { ExternalLinkIcon } from '../icons/external'

import '../closeCellButton'
import './categorySelector'

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

interface configDetails {
  description: string
  docs: string
}

@customElement(RENDERERS.EditAnnotations)
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
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      width: inherited;
      position: relative;
    }

    .annotation-container h4 {
      margin-block: 0;
    }

    .annotation-item::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
      min-width: fit-content;
      max-width: calc(65% - 10px);
    }

    .annotation-item::part(root) {
      background: transparent;
      border: none;
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

    .has-errors,
    .error-container {
      border: solid 1px var(--vscode-errorForeground);
    }

    .error-container {
      padding: 0.1rem;
    }

    .current-value-error {
      padding: 1rem;
    }

    .grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      width: 100%;
    }

    .box {
      width: calc(50% - 10px);
      padding: 4px;
      box-sizing: border-box;
      overflow-x: auto;
      margin-top: 12px;
    }

    .themeText {
      color: var(--vscode-foreground);
    }

    .noSelect {
      user-select: none;
    }
  `

  readonly #details: { [id: string]: configDetails } = {
    background: {
      description: 'Run the cell as background process.',
      docs: 'https://docs.runme.dev/getting-started/vs-code#background-processes',
    },
    interactive: {
      description: 'Run cell inside terminal to allow for interactive input.',
      docs: 'https://docs.runme.dev/configuration/cell-level#interactive-vs-non-interactive-cells',
    },
    closeTerminalOnSuccess: {
      description: 'Hide terminal after cell successful execution.',
      docs: 'https://docs.runme.dev/configuration/cell-level#terminal-visibility-post-execution',
    },
    promptEnv: {
      description: 'Prompt user input for exported environment variables.',
      docs: 'https://docs.runme.dev/configuration/cell-level#set-environment-variables',
    },
    mimeType: {
      description: "Cell's output content MIME type.",
      docs: 'https://docs.runme.dev/configuration/reference#supported-mime-types',
    },
    name: {
      description: "Cell's canonical name for easy referencing in the CLI.",
      docs: 'https://docs.runme.dev/configuration/cell-level#unnamed-vs-named-cells',
    },
    interpreter: {
      description: 'Inserted into shebang (aka #!) line',
      docs: 'https://docs.runme.dev/configuration/shebang',
    },
    category: {
      description: 'Execute this code cell within a category. (no comma or spaces allowed)',
      docs: 'https://docs.runme.dev/configuration/cell-level#run-all-cells-by-category',
    },
    excludeFromRunAll: {
      description: 'Prevent executing this cell during the "Run All" operation.',
      docs: 'https://docs.runme.dev/configuration/cell-level#exclude-cell-from-run-all',
    },
    terminalRows: {
      description: 'Number of rows to display in the notebook terminal.',
      docs: 'https://docs.runme.dev/configuration/cell-level#terminal-row',
    },
  }

  // Declare reactive properties
  @property({ type: Object, reflect: true })
  annotations?: CellAnnotations

  @property({ type: Object, reflect: true })
  validationErrors?: CellAnnotationsErrorResult

  @property()
  categories: string[] = []

  #getTargetValue(e: Target) {
    switch (e.target.type) {
      case 'text':
        return e.target.value
      default:
        return e.target.checked.toString()
    }
  }

  #onChange(e: MouseEvent & Target) {
    if (!this.annotations || !e.target) {
      return
    }

    const propVal: any = { 'runme.dev/id': this.annotations['runme.dev/id'] }
    const propName = e.target.id
    const targetValue = this.#getTargetValue(e)

    const parseResult = CellAnnotationsSchema.safeParse({
      [propName]: targetValue,
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
        ;(this.annotations as any)[propName] = targetValue
        propVal[propName] = targetValue
        return this.#dispatch(propVal)
      default:
        ;(this.annotations as any)[e.target.id] = targetValue
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
    const details = this.#details?.[id] as any

    return html`<vscode-checkbox
      id="${id}"
      @change="${this.#onChange}"
      checked="${isReadOnly ? true : isChecked}"
      @blur="${this.#onChange}"
      readonly=${isReadOnly}
      class="annotation-item"
      >${details.description}</vscode-checkbox
    >`
  }

  renderTextField(id: string, text: string, placeHolder: string = '') {
    const details = this.#details?.[id] as any

    return html`<vscode-text-field
      id="${id}"
      type="text"
      value="${text}"
      @change="${this.#onChange}"
      @keyup="${this.#onChange}"
      placeholder=${placeHolder}
      size="50"
      class="annotation-item"
      ><div style="margin-top:2px;margin-bottom:10px;">
        ${details.description}
      </div></vscode-text-field
    >`
  }

  renderErrors(errorMessages: string[]) {
    return html`<ul>
      ${errorMessages.map((error: string) => {
        return html`<li class="error-item">${error}</li>`
      })}
    </ul>`
  }

  renderCurrentValueError(value: string) {
    return html`<p class="error-item current-value-error">Received value: ${value}</p>`
  }

  renderDocsLink(link: string) {
    return html`<vscode-link href="${link}">(docs ${ExternalLinkIcon})</vscode-link>`
  }

  renderCheckboxTabEntry(id: AnnotationsKey) {
    const value = this.annotations?.[id]
    const details = this.#details?.[id]

    return html`<div>
      <div class="themeText" style="font-weight:600">
        ${id} ${this.renderDocsLink(details.docs)}
      </div>
      <div style="padding-top:4px">${this.renderCheckbox(id, value as boolean, false)}</div>
    </div> `
  }

  renderTextFieldTabEntry(id: AnnotationsKey) {
    const value = this.annotations?.[id]
    const details = this.#details?.[id]

    const errors: string[] = this.validationErrors?.errors
      ? this.validationErrors.errors[id as keyof CellAnnotations] || []
      : []
    const originalValue = errors.length
      ? this.validationErrors?.originalAnnotations[id as keyof CellAnnotations]
      : value

    return html`<div>
        <div style="font-weight:600" class="themeText">
          ${id} ${this.renderDocsLink(details.docs)}
        </div>
        <div style="padding-top:4px">${this.renderTextField(id, value as string)}</div>
      </div>

      ${when(errors.length, () => this.renderErrors(errors))}
      ${when(
        typeof value === 'boolean' && errors.length,
        () => this.renderCurrentValueError(originalValue as string),
        () => html``,
      )} `
  }

  renderCategoryTabEntry(id: AnnotationsKey) {
    const value = this.annotations?.[id]
    const details = this.#details?.[id]

    return html`<div>
      <div>
        <category-selector
          categories="${this.categories}"
          createNewCategoryText="Add ${id}"
          selectCategoryText="Select ${id}"
          selectedCategory="${value}"
          description="${details.description}"
          identifier="${id}"
          @onChange=${this.onCategorySelectorChange}
          @onCreateNewCategory=${this.createNewCategoryClick}
        ></category-selector>
      </div>
    </div>`
  }

  private getCellId() {
    return (this.annotations && this.annotations['runme.dev/id']) || ''
  }

  protected onCategorySelectorChange(e: CustomEvent) {
    this.categories = e.detail.categories.split(CATEGORY_SEPARATOR)
    this.setCategory()
  }

  protected createNewCategoryClick() {
    const ctx = getContext()
    ctx.postMessage &&
      postClientMessage(ctx, ClientMessages.displayPrompt, {
        placeholder: 'Category name',
        isSecret: false,
        title: 'New cell execution category',
        id: this.getCellId(),
      })
  }

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    const id = this.getCellId()
    ctx.postMessage &&
      postClientMessage(ctx, ClientMessages.getState, {
        state: NOTEBOOK_AVAILABLE_CATEGORIES,
        id,
      })
    onClientMessage(ctx, (e) => {
      switch (e.type) {
        case ClientMessages.onPrompt:
          const answer = e.output.answer
          if (!answer || e.output.id !== id) {
            return
          }
          for (const newCategory of answer.split(CATEGORY_SEPARATOR)) {
            if (!this.categories.includes(newCategory)) {
              this.categories.push(newCategory)
            }
          }
          ctx.postMessage &&
            postClientMessage(ctx, ClientMessages.setState, {
              state: NOTEBOOK_AVAILABLE_CATEGORIES,
              value: this.categories,
              id,
            })
          return this.setCategory(answer)
        case ClientMessages.onGetState:
          if (e.output.state === NOTEBOOK_AVAILABLE_CATEGORIES && e.output.id === id) {
            this.categories = e.output.value as unknown as string[]
            this.requestUpdate()
          }
          break
        default:
          return
      }
    })
  }

  private setCategory(category?: string) {
    if (this.annotations) {
      this.annotations.category = category || this.annotations.category
      this.requestUpdate()

      /**
       * make VS Code display warn message to save document
       */
      const ctx = getContext()
      postClientMessage(ctx, ClientMessages.onCategoryChange, undefined)

      return this.#dispatch({
        'runme.dev/id': this.annotations['runme.dev/id'],
        category: this.categories.join(CATEGORY_SEPARATOR),
      })
    }
  }

  // Render the UI as a function of component state
  render() {
    if (!this.annotations) {
      return html`⚠️ Whoops! Something went wrong displaying the editing UI!`
    }

    const markup = html`<div style="width:100%;">
      <vscode-panels>
        <vscode-panel-tab id="tab-1" class="themeText noSelect">GENERAL</vscode-panel-tab>
        <vscode-panel-tab id="tab-2" class="themeText noSelect">ADVANCED</vscode-panel-tab>
        <vscode-panel-view id="view-1">
          <div class="grid">
            <div class="box">${this.renderTextFieldTabEntry('name')}</div>
            <div class="box">${this.renderCheckboxTabEntry('background')}</div>
            <div class="box">${this.renderCheckboxTabEntry('interactive')}</div>
            <div class="box">${this.renderCheckboxTabEntry('closeTerminalOnSuccess')}</div>
          </div>
        </vscode-panel-view>
        <vscode-panel-view id="view-2">
          <div class="grid">
            <div class="box">${this.renderCheckboxTabEntry('excludeFromRunAll')}</div>
            <div class="box">${this.renderCheckboxTabEntry('promptEnv')}</div>
            <div class="box">${this.renderTextFieldTabEntry('mimeType')}</div>
            <div class="box">${this.renderCategoryTabEntry('category')}</div>
            <div class="box">${this.renderTextFieldTabEntry('terminalRows')}</div>
            <div class="box">${this.renderTextFieldTabEntry('interpreter')}</div>
          </div>
        </vscode-panel-view>
      </vscode-panels>
    </div>`

    const errorArr = Object.keys(this.#details).map((key) => {
      const errors: string[] = this.validationErrors?.errors
        ? this.validationErrors.errors[key as keyof CellAnnotations] || []
        : []
      return errors.length
    })

    const errorCount = errorArr.reduce(function (a, b) {
      return a + b
    })

    return html` <section class="annotation-container ${errorCount ? 'has-errors' : ''}">
      ${markup}
      <close-cell-button
        @closed="${() => {
          return closeOutput({
            id: (this.annotations && this.annotations['runme.dev/id']) || '',
            outputType: OutputType.annotations,
          })
        }}"
      ></close-cell-button>
      ${when(
        errorCount,
        () =>
          html` <p class="error-item">
            This configuration block contains errors, using the default values instead
          </p>`,
        () => html``,
      )}
    </section>`
  }
}
