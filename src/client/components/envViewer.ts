import { Disposable } from 'vscode'
import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { SnapshotEnvSpecName } from '../../types'

import { CopyIcon } from './icons/copy'
import { EyeClosedIcon } from './icons/eyeClosed'
import { EyeIcon } from './icons/eye'
import { CheckIcon } from './icons/check'

import './tooltip'

@customElement('env-viewer')
export class EnvViewer extends LitElement implements Disposable {
  protected disposables: Disposable[] = []

  @property({ type: String })
  value: string | undefined

  @property({ type: String })
  spec: SnapshotEnvSpecName | undefined

  @property({ type: Boolean })
  displaySecret: boolean = false

  @property({ type: String })
  maskedValue?: string | undefined

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
    .secret-container {
      display: flex;
      gap: 1px;
      justify-content: space-between;
    }

    .secret-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      max-height: 100px;
    }

    .actions {
      display: flex;
      gap: 1px;
      padding-right: 4px;
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

  dispose() {
    this.disposables.forEach((disposable) => disposable.dispose())
  }

  render() {
    const hideEyeButton = [
      undefined,
      SnapshotEnvSpecName.Plain,
      SnapshotEnvSpecName.Secret,
      SnapshotEnvSpecName.Password,
    ].includes(this.spec)
    return html`
      <div class="secret-container">
        ${when(
          this.displaySecret || this.spec === SnapshotEnvSpecName.Plain,
          () =>
            html`<tooltip-text
              class="secret-text"
              .tooltipText="${this.value}"
              .value="${this.value}"
            ></tooltip-text>`,
          () =>
            when(
              this.maskedValue,
              () => {
                return html`<span class="secret-text">${this.maskedValue}</span>`
              },
              () => {
                return Array.from({ length: 20 }, (_, index) => index + 1)
                  .map((el) => '*')
                  .join('')
              },
            ),
        )}
        <div class="actions">
          ${when(
            hideEyeButton,
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
          ${when(
            [SnapshotEnvSpecName.Plain, SnapshotEnvSpecName.Opaque].includes(this.spec!),
            () => {
              return html` <vscode-button
                appearance="icon"
                class="cursor-pointer"
                @click=${this.onCopy}
                >${when(
                  this._copied,
                  () => html`${CheckIcon}`,
                  () => html`${CopyIcon}`,
                )}</vscode-button
              >`
            },
            () => {
              return html``
            },
          )}
        </div>
      </div>
    `
  }
}
