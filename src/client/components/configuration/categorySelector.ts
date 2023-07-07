import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ExternalLinkIcon } from '../icons/external'

export interface ISelectedCategory {
  name: string
}

@customElement('category-selector')
export class CategorySelector extends LitElement {
  static styles = css`
    :host([appearance='secondary']) {
      background: red;
    }

    label {
      font-size: var(--notebook-cell-output-font-size);
    }

    .category-item::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }
    .category-item::part(root) {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
    }
    .category-item::part(label) {
      color: var(--vscode-foreground);
    }
    .category-item::part(checked-indicator) {
      fill: var(--vscode-foreground);
    }

    .category-item::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .annotation-item::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
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

    .category-button {
      color: var(--vscode-button-foreground);
    }

    .category-button label {
      cursor: pointer;
    }

    .primary {
      background-color: var(--vscode-button-background);
    }

    .flex-row {
      display: flex;
      flex-direction: row;
    }

    .flex-column > *:not(:last-child) {
      margin-bottom: 4px;
    }

    .flex-column {
      display: flex;
      flex-direction: column;
    }

    .flex-row > *:not(:last-child) {
      margin-right: 4px;
    }

    .themeText {
      color: var(--vscode-foreground);
    }
  `

  @property({ type: String })
  categories: string = ''

  @property({ type: String })
  createNewCategoryText: string | undefined

  @property({ type: String })
  selectCategoryText: string | undefined

  @property()
  selectedCategory: string | undefined

  @property()
  description: string | undefined

  @property()
  identifier: string | undefined

  private onCreateNewCategory(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onCreateNewCategory')
    this.dispatchEvent(event)
  }

  private onSelectCategory(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onSelectCategory')
    this.dispatchEvent(event)
  }

  private onChange(e: any) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onChange', {
      detail: e.target.value,
    })
    this.dispatchEvent(event)
  }

  renderLink() {
    return html`<vscode-link href="https://docs.runme.dev/configuration#run-all-cells-by-category"
      >(docs ${ExternalLinkIcon})</vscode-link
    >`
  }

  render() {
    return html`
      <div class="flex-column themeText">
        <div style="font-weight:600;">${this.identifier} ${this.renderLink()}</div>
        <div style="font-weight:300;">${this.description}</div>

        ${when(
          this.categories.length,
          () => html`<vscode-text-field
            type="text"
            value="${this.selectedCategory}"
            size="30"
            @change="${this.onChange}"
            @click="${this.onSelectCategory}"
            readonly
            class="annotation-item"
          >
          </vscode-text-field>`
        )}

        <div class="flex-row" style="margin-top:4px">
          <vscode-button
            appearance="secondary"
            class="category-button"
            @click="${this.onCreateNewCategory}"
          >
            <label>${this.createNewCategoryText}</label>
          </vscode-button>
          ${when(
            this.categories.length,
            () => html` <vscode-button
              class="category-button primary"
              @click="${this.onSelectCategory}"
            >
              <label>${this.selectCategoryText}</label>
            </vscode-button>`,
            () => html``
          )}
        </div>
      </div>
    `
  }
}
