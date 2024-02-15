import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ShareIcon } from '../icons/share'
import { SaveIcon } from '../icons/save'

@customElement('share-cell')
export class ShareCell extends LitElement {
  @property({ type: String })
  shareText: string = 'Copy'

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false

  @property({ type: Boolean, reflect: true })
  displayShareIcon: boolean = false

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

  private onShareClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onShare')
    this.dispatchEvent(event)
  }

  render() {
    const className = this.shareText.toLocaleLowerCase()
    return when(
      this.disabled,
      () => html`
        <vscode-button
          class=${className}
          disabled
          appearance="secondary"
          @click=${this.onShareClick}
        >
          ${ShareIcon} ${this.shareText}
        </vscode-button>
      `,
      () => html`
        <vscode-button class=${className} appearance="secondary" @click=${this.onShareClick}>
          ${this.displayShareIcon ? ShareIcon : SaveIcon} ${this.shareText}
        </vscode-button>
      `,
    )
  }
}
