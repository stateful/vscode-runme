import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { ShareIcon } from '../icons/share'

@customElement('share-cell')
export class ShareCell extends LitElement {

  @property({ type: String })
  shareText: string = 'Copy'

  @property({ type: Boolean, reflect: true })
  disabled: boolean = false

  /* eslint-disable */
  static styles = css`
    vscode-button {
        background: transparent;
        color: #ccc;
        transform: scale(.9);
      }
      vscode-button:hover {
        background: var(--button-secondary-background);
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

  private onShareClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onShare')
    this.dispatchEvent(event)
  }

  render() {
    return when(this.disabled, () => html`
    <vscode-button disabled appearance="secondary" @click=${this.onShareClick}>
      ${ShareIcon}
      ${this.shareText}
    </vscode-button>
    `, () => html`
    <vscode-button appearance="secondary" @click=${this.onShareClick}>
      ${ShareIcon}
      ${this.shareText}
    </vscode-button>
    `)

  }
}