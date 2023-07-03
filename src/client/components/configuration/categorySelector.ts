import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

export interface ISelectedCategory {
  name: string
}
@customElement('category-selector')
export class CategorySelector extends LitElement {
  static styles = css`
    .category-selector-form {
      display: flex;
      align-items: flex-end;
      max-width: 630px;
    }

    :host([appearance='secondary']) {
      background: red;
    }

    label {
      font-size: var(--notebook-cell-output-font-size);
    }

    .category-item {
      min-width: 200px;
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
    .row {
      width: 100%;
      margin-right: 0.5rem;
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
      margin-bottom: 0.2rem;
      margin-right: 0.5rem;
    }

    .category-button label {
      cursor: pointer;
    }

    .primary {
      background-color: var(--vscode-button-background);
    }

    @media only screen and (max-width: 630px) {
      .category-selector-form {
        flex-direction: column;
        margin-left: 0.5rem;
      }

      .category-button {
        margin-top: 0.5rem;
      }
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

  render() {
    return html`
      <div class="category-selector-form">
        <div class="row">
          ${html`<vscode-text-field
            type="text"
            value="${this.selectedCategory}"
            size="30"
            @change="${this.onChange}"
            readonly
            class="annotation-item"
          >
            <div>${this.identifier}</div>
            <div style="font-weight:300;padding-top:4px;padding-bottom:6px">
              ${this.description}
            </div>
          </vscode-text-field>`}
        </div>
        <div class="row">
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
          <vscode-button
            appearance="secondary"
            class="category-button"
            @click="${this.onCreateNewCategory}"
          >
            <label>${this.createNewCategoryText}</label>
          </vscode-button>
        </div>
      </div>
    `
  }
}
