import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export interface DropdownListOption {
  text: string
  value: string
  enumNum?: number
}

export type DropdownListEvent = {
  value: string
  key: string
}

@customElement('dropdown-list')
export class DropdownList extends LitElement {
  @property({ type: String })
  label: string | undefined

  @property({ type: String })
  defaultValue?: string | undefined

  @property({ type: Array })
  options?: DropdownListOption[]

  @property({ type: String })
  key: string | undefined

  /* eslint-disable */
  static styles = css`
    .dropdown-container label {
      color: var(--vscode-settings-dropdownForeground);
      margin-bottom: 10px;
    }

    .dropdown-container {
      box-sizing: border-box;
      display: flex;
      flex-flow: column wrap;
      align-items: flex-start;
      justify-content: flex-start;
      width: 100%;
    }

    .dropdown-container select {
      background-color: var(--vscode-settings-dropdownBackground);
      color: var(--vscode-settings-dropdownForeground);
      border-color: var(--vscode-settings-dropdownBorder);
      padding: 4px;
      width: 100%;
      height: calc(100% - (var(--design-unit) * 1px));
    }

    .select-container {
      width: 100%;
    }

    .select-container {
      width: 100%;
    }
  `
  private onSelectedValueHandler(e: Event) {
    const inputElement = e.target as HTMLInputElement
    if (!e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onSelectedValue', {
      detail: {
        value: inputElement.value,
        key: this.key,
      },
    })
    this.dispatchEvent(event)
  }

  render() {
    return html`
      <div class="dropdown-container">
        <label slot="label">${this.label}</label>
        <div class="select-container">
          <select @change=${this.onSelectedValueHandler}>
            ${this.options?.map(({ text, value, enumNum }: DropdownListOption) => {
              enumNum ??= Number.POSITIVE_INFINITY
              return value === this.defaultValue || enumNum === Number(this.defaultValue)
                ? html`<option value="${value}" selected>${text}</option>`
                : html`<option value="${value}">${text}</option>`
            })}
          </select>
        </div>
      </div>
    `
  }
}
