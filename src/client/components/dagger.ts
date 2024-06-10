import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { Disposable } from 'vscode'

import { DaggerState } from '../../types'
import { RENDERERS, ClientMessages } from '../../constants'
import { getContext } from '../utils'
import { onClientMessage } from '../../utils/messaging'

import { DaggerIcon } from './icons/dagger'
import './spinner'

@customElement(RENDERERS.DaggerCli)
export class DaggerCli extends LitElement {
  protected disposables: Disposable[] = []

  // Define scoped styles right with your component, in plain CSS
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

    .button-group {
      display: flex;
      flex-direction: row;
      justify-content: end;
    }

    section {
      display: flex;
      flex-direction: column;
      gap: 5px;
      position: relative;
    }
  `

  @property({ type: Object })
  state: DaggerState = {}

  private get actions(): string[] {
    return this.state?.cli?.actions ?? []
  }

  private get cellId(): string {
    return this.state.cellId!
  }

  private get active(): boolean {
    return this.state.cli?.status === undefined
  }

  private onAction(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    // closeOutput({
    //   id: this.cellId,
    //   outputType: OutputType.terminal,
    // })
  }

  #applyState(dagger: any) {
    let actions: string[] = []

    switch (dagger.state._type) {
      case 'Container':
        actions = ['As Service', 'Publish', 'Terminal', 'Entrypoint']
        break
      case 'Directory':
        actions = ['Entires', 'Directory', 'File', 'Glob', 'Export']
        break
      case 'File':
        actions = ['Name', 'Size', 'Contents', 'Export']
        break
    }

    this.state = <DaggerState>{
      cellId: dagger.cellId,
      cli: {
        status: 'complete',
        actions,
      },
    }
    this.requestUpdate()
  }

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    this.disposables.push(
      onClientMessage(ctx, async (e) => {
        switch (e.type) {
          case ClientMessages.syncDaggerState:
            this.#applyState(e.output)
        }
      }),
    )
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.dispose()
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  // Render the UI as a function of component state
  render() {
    return html`<section>
      <div class="button-group">
        ${when(
          this.active,
          () => html`<vscode-spinner />`,
          () =>
            this.actions.map((a) => {
              return html`<dagger-button label=${a} @clicked="${this.onAction}" />`
            }),
        )}
      </div>
    </section>`
  }
}

@customElement('dagger-button')
export class CopyButton extends LitElement {
  @property({ type: String })
  label: string = 'Button'

  @property({ type: String })
  icon: TemplateResult<1> = DaggerIcon
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

  private onClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('clicked')
    this.dispatchEvent(event)
  }

  render() {
    return html`
      <vscode-button appearance="secondary" @click=${this.onClick}
        >${this.icon} ${this.label}</vscode-button
      >
    `
  }
}
