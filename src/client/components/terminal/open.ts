import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { EyeIcon } from '../icons/eye'

@customElement('open-cell')
export class OpenCell extends LitElement {
  @property({ type: String })
  openText: string = 'Open'

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false

  /* eslint-disable */
  static styles = css`
    vscode-button {
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      transform: scale(0.9);
    }
    vscode-button:hover {
      background: var(--vscode-button-hoverBackground);
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

  private onOpenClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onOpen')
    this.dispatchEvent(event)
  }

  render() {
    const className = this.openText.toLocaleLowerCase()

    return when(
      this.disabled,
      () => {},
      () => html`
        <vscode-button class=${className} appearance="secondary" @click=${this.onOpenClick}>
          ${EyeIcon} ${this.openText}
        </vscode-button>
      `,
    )
  }
}
