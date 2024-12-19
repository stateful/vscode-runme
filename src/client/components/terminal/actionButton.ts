import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ShareIcon } from '../icons/share'
import { SaveIcon } from '../icons/save'

@customElement('action-button')
export class ActionButton extends LitElement {
  @property({ type: String })
  text: string = 'Copy'

  @property({ type: String })
  loadingText: string = 'Saving...'

  @property({ type: Boolean, reflect: true })
  loading: boolean = false

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false

  @property({ type: Boolean, reflect: true })
  shareIcon: boolean | undefined

  @property({ type: Boolean, reflect: true })
  saveIcon: boolean | undefined

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
    vscode-button.escalate {
      background-color: var(--vscode-errorForeground);
    }
    .icon {
      width: 13px;
      margin: 0 5px 0 -5px;
      padding: 0;
    }
  `

  private onClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }

    const event = new CustomEvent(this.disabled ? 'onClickDisabled' : 'onClick')

    this.dispatchEvent(event)
  }

  render() {
    const className = this.text.toLocaleLowerCase()
    return html`
      <vscode-button
        ?disabled=${this.loading}
        class=${className}
        appearance="secondary"
        @click=${this.onClick}
      >
        ${when(this.shareIcon, () => ShareIcon)} ${when(this.saveIcon, () => SaveIcon)}
        ${when(
          this.loading,
          () => html`${this.loadingText}`,
          () => html`${this.text}`,
        )}
      </vscode-button>
    `
  }
}
