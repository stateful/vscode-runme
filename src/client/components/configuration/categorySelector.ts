/* eslint-disable max-len */
import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TextField } from '@vscode/webview-ui-toolkit'

import { ExternalLinkIcon } from '../icons/external'
import { CATEGORY_SEPARATOR } from '../../../constants'
import { Settings } from '../../../types'

export interface ISelectedCategory {
  name: string
}

export interface IUpdatedCategory {
  before: string
  after: string
}

@customElement('category-item')
export class CategoryItem extends LitElement {
  #isEditing = false
  #hasError = false

  static styles = css`
    :host {
      padding: 10px 0;
    }
    .item-container {
      display: flex;
    }
    .item-container.editMode {
      margin: 3px 0 2px;
    }
    .item-container:not(.editMode):hover {
      background-color: var(--theme-input-background);
    }
    .item-container pre {
      margin: 0;
      padding: 0;
      text-align: left;
      display: block;
      width: 100%;
      line-height: 10px;
      padding: 10px 10px 4px;
    }
    .actions-container {
      list-style: none;
      margin: 0;
      display: flex;
    }
    .actions-container li {
      margin: 0px 2px;
      cursor: pointer;
    }
    .actions-container li a {
      padding: 8px 7px 4px;
      display: block;
    }
    .item-container:not(.editMode) .actions-container li:hover {
      background-color: rgba(90, 93, 94, 0.31);
    }
    vscode-text-field {
      width: 100%;
    }
  `

  @property({ type: String })
  category: string = ''

  #onCategoryNameChange(e: Event) {
    this.#hasError = false
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const textfield = this.shadowRoot?.querySelector('vscode-text-field') as TextField
    const newName = textfield.value

    if (newName.includes(' ') || newName.includes(',')) {
      this.#hasError = true
      this.requestUpdate()
      return
    }

    const event = new CustomEvent<IUpdatedCategory>('onCategoryUpdated', {
      detail: { before: this.category, after: newName },
    })
    this.dispatchEvent(event)
    this.#isEditing = false
    this.requestUpdate()
  }

  #renderEditMode() {
    return html`<div class="item-container editMode">
      <vscode-text-field
        style="${this.#hasError ? 'border: 1px solid red' : ''}"
        value="${this.category}"
        placeholder=${this.category}
        @change=${this.#onCategoryNameChange}
      >
      </vscode-text-field>
      <ul class="actions-container editMode" role="toolbar">
        <li
          class="action-item"
          style="padding: 0 2px 0 0"
          role="presentation"
          title="Edit Tag Item"
        >
          <vscode-button appearance="primary" @click="${this.#onCategoryNameChange}">
            <label>OK</label>
          </vscode-button>
        </li>
        <li
          class="action-item"
          style="padding: 0 0 0px 2px"
          role="presentation"
          title="Remove Tag Item"
        >
          <vscode-button
            appearance="secondary"
            @click="${() => {
              this.#isEditing = false
              this.requestUpdate()
            }}"
          >
            <label>Cancel</label>
          </vscode-button>
        </li>
      </ul>
    </div>`
  }

  #renderViewMode() {
    return html`<div class="item-container">
      <pre>${this.category}</pre>
      <ul class="actions-container" role="toolbar">
        <li class="action-item" role="presentation" title="Edit Tag Item">
          <a
            class="action-label codicon codicon-settings-edit"
            role="button"
            aria-label="Edit Tag Item"
            aria-checked=""
            tabindex="0"
            @click="${() => {
              this.#isEditing = true
              this.requestUpdate()
            }}"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path
                d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z"
              />
            </svg>
          </a>
        </li>
        <li class="action-item" role="presentation" title="Remove TAg Item">
          <a
            class="action-label codicon codicon-settings-remove"
            role="button"
            aria-label="Remove Tag Item"
            aria-checked=""
            @click="${() => {
              const event = new CustomEvent('onCategoryRemoved', {
                detail: { name: this.category },
              })
              this.dispatchEvent(event)
            }}"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"
              />
            </svg>
          </a>
        </li>
      </ul>
    </div>`
  }

  render() {
    return this.#isEditing ? this.#renderEditMode() : this.#renderViewMode()
  }
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

    .categories {
      margin: 10px 0;
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

  @property({ type: Object })
  settings: Settings = {}

  private dispatchComponentEvent(name: string, e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent(name, e)
    this.dispatchEvent(event)
  }

  #onCategoryRemoved(e: CustomEvent<ISelectedCategory>) {
    this.categories = this.categories
      .split(CATEGORY_SEPARATOR)
      .filter((category) => category !== e.detail.name)
      .join(CATEGORY_SEPARATOR)
    const event = new CustomEvent('onChange', { detail: { categories: this.categories } })
    this.dispatchEvent(event)
  }

  #onCategoryUpdated(e: CustomEvent<IUpdatedCategory>) {
    this.categories = this.categories
      .split(CATEGORY_SEPARATOR)
      .map((category) => {
        if (category === e.detail.before) {
          return e.detail.after
        }
        return category
      })
      .join(CATEGORY_SEPARATOR)
    const event = new CustomEvent('onChange', { detail: { categories: this.categories } })
    this.dispatchEvent(event)
  }

  renderLink() {
    return html`<vscode-link
      href="${this.settings?.docsUrl}/configuration#run-all-cells-by-category"
      >(docs ${ExternalLinkIcon})</vscode-link
    >`
  }

  render() {
    return html`
      <div class="flex-column themeText">
        <div style="font-weight:600;">tag ${this.renderLink()}</div>
        <div style="font-weight:300;">${this.description}</div>

        <div class="categories">
          ${this.categories
            .split(CATEGORY_SEPARATOR)
            .filter(Boolean)
            .map(
              (categeory: string) =>
                html`<category-item
                  category="${categeory}"
                  @onCategoryRemoved="${this.#onCategoryRemoved}"
                  @onCategoryUpdated="${this.#onCategoryUpdated}"
                />`,
            )}
        </div>

        <div class="flex-row" style="margin-top:4px">
          <vscode-button
            appearance="primary"
            class="category-button"
            @click="${this.dispatchComponentEvent.bind(this, 'onCreateNewCategory')}"
          >
            <label>${this.createNewCategoryText}</label>
          </vscode-button>
        </div>
      </div>
    `
  }
}
