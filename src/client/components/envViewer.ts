import { Disposable } from 'vscode'
import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import { MonitorEnvStoreResponseSnapshot_Status } from '../../extension/grpc/runner/v1'

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

  @property({ type: Number })
  status: MonitorEnvStoreResponseSnapshot_Status | undefined

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
      white-space: nowrap;
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
      MonitorEnvStoreResponseSnapshot_Status.MASKED,
      MonitorEnvStoreResponseSnapshot_Status.LITERAL,
      MonitorEnvStoreResponseSnapshot_Status.UNSPECIFIED,
    ].includes(this.status)
    return html`
      <div class="secret-container">
        ${when(
          this.displaySecret,
          () => html`<span class="secret-text">${this.value}</span>`,
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
            [
              MonitorEnvStoreResponseSnapshot_Status.LITERAL,
              MonitorEnvStoreResponseSnapshot_Status.HIDDEN,
            ].includes(this.status!),
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
