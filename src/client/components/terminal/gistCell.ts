import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { GistIcon } from '../icons/gistIcon'

@customElement('gist-cell')
export class GistCell extends LitElement {
  @property({ type: String })
  text: string = 'Preview & Gist'

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
    vscode-button.escalate {
      background-color: var(--vscode-errorForeground);
    }
    .icon {
      width: 13px;
      margin: 0 5px 0 -5px;
      padding: 0;
    }
  `

  private onGistClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onGist')
    this.dispatchEvent(event)
  }

  render() {
    const className = this.text.toLocaleLowerCase()
    return when(
      this.disabled,
      () => html`
        <vscode-button class=${className} disabled appearance="secondary">
          ${GistIcon} ${this.text}
        </vscode-button>
      `,
      () => html`
        <vscode-button class=${className} appearance="secondary" @click=${this.onGistClick}>
          ${GistIcon} ${this.text}
        </vscode-button>
      `,
    )
  }
}
