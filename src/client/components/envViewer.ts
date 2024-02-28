import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { EnvVarSpec } from '../../types'

import { CopyIcon } from './icons/copy'
import { EyeClosedIcon } from './icons/eyeClosed'
import { EyeIcon } from './icons/eye'
import { CheckIcon } from './icons/check'

@customElement('env-viewer')
export class EnvViewer extends LitElement {
  @property({ type: String })
  value: string | undefined

  @property({ type: String })
  spec: EnvVarSpec | undefined

  @property({ type: Boolean })
  displaySecret: boolean = false

  @state()
  _copied: boolean = false

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
    .secret-container {
      display: flex;
      gap: 1px;
      justify-content: space-between;
    }

    .actions {
      display: flex;
      gap: 1px;
    }

    .cursor-pointer {
      cursor: pointer;
    }
  `

  private onCopy(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('onCopy')
    this.dispatchEvent(event)
    this._copied = true
    setTimeout(() => (this._copied = false), 1000)
  }

  private toggleVisibility() {
    this.displaySecret = !this.displaySecret
  }

  render() {
    return html`
      <div class="secret-container">
        ${when(
          this.displaySecret || this.spec === EnvVarSpec.Value,
          () => this.value,
          () =>
            Array.from({ length: 20 }, (_, index) => index + 1)
              .map((el) => '*')
              .join(''),
        )}
        <div class="actions">
          ${when(
            this.spec === EnvVarSpec.Value,
            () => html``,
            () => {
              return when(
                this.displaySecret,
                () => {
                  return html` <vscode-button
                    appearance="icon"
                    class="cursor-pointer"
                    @click=${this.toggleVisibility}
                  >
                    ${EyeClosedIcon}
                  </vscode-button>`
                },
                () => {
                  return html` <vscode-button
                    appearance="icon"
                    class="cursor-pointer"
                    @click=${this.toggleVisibility}
                  >
                    ${EyeIcon}
                  </vscode-button>`
                },
              )
            },
          )}
          <vscode-button appearance="icon" class="cursor-pointer" @click=${this.onCopy}
            >${when(
              this._copied,
              () => html`${CheckIcon}`,
              () => html`${CopyIcon}`,
            )}</vscode-button
          >
        </div>
      </div>
    `
  }
}
