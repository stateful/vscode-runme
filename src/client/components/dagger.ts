import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { Disposable } from 'vscode'

import { DaggerState, DaggerStateAction } from '../../types'
import { RENDERERS, ClientMessages } from '../../constants'
import { getContext } from '../utils'
import { onClientMessage, postClientMessage } from '../../utils/messaging'

import { DaggerIcon, DaggerLogo } from './icons/dagger'
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
    .logo {
      width: 13px;
      padding-right: 4px;
      scale: 1.5;
    }

    .info {
      margin: 5px 5px;
      font-size: 1.4em;
    }

    .groups {
      display: flex;
      justify-content: space-between;
    }

    section {
      display: flex;
      flex-direction: column;
      gap: 5px;
      position: relative;
    }
  `
  @property({ type: String })
  cellId?: string

  @property({ type: Object })
  state: DaggerState = {}

  private get actions(): DaggerStateAction[] {
    return this.state?.cli?.actions ?? []
  }

  private get running(): boolean {
    return this.state.cli?.status === 'active'
  }

  private get returnedType(): string | undefined {
    return this.state.cli?.returnType
  }

  private onAction(a: DaggerStateAction) {
    return (e: Event) => {
      if (e.defaultPrevented) {
        e.preventDefault()
      }

      let command = `${a.command} ${a.action}`
      if (a.action === 'terminal') {
        command = command.replace(' --progress=plain', '')
      }

      const ctx = getContext()
      ctx.postMessage &&
        postClientMessage(ctx, ClientMessages.daggerCliAction, {
          cellId: this.cellId!,
          command,
        })
    }
  }

  #applyState(dagger: any) {
    if (dagger.cellId !== this.cellId) {
      return
    }

    if (dagger.text !== undefined) {
      this.state = <DaggerState>{
        cellId: dagger.cellId,
        cli: {
          status: 'complete',
        },
      }
      return
    }

    const command = dagger.json?.runme.cellText
    let actions: DaggerStateAction[] = []
    switch (dagger.json?._type) {
      case 'Container':
        actions = [
          { command, label: 'As Service', action: 'as-service' },
          { command, label: 'Publish', action: 'publish' },
          { command, label: 'Terminal', action: 'terminal' },
          { command, label: 'Entrypoint', action: 'entrypoint' },
        ]
        break
      case 'Directory':
        actions = [
          { command, label: 'Entires', action: 'entries' },
          { command, label: 'Directory', action: 'directory' },
          { command, label: 'File', action: 'file' },
          { command, label: 'Glob', action: 'glob' },
          { command, label: 'Export', action: 'export' },
        ]
        break
      case 'File':
        actions = [
          { command, label: 'Name', action: 'name' },
          { command, label: 'Size', action: 'size' },
          { command, label: 'Contents', action: 'contents' },
          { command, label: 'Export', action: 'export' },
        ]
        break
    }

    this.state = <DaggerState>{
      cellId: dagger.cellId,
      cli: {
        status: 'complete',
        actions,
        returnType: dagger.json?._type,
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
          case ClientMessages.daggerSyncState:
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
    const status = when(
      !this.running && this.returnedType,
      () => html`${this.returnedType} ready`,
      () => (this.running ? html`Running` : html`Done`),
    )
    return html`<section>
      <div class="groups">
        <div class="info">${DaggerLogo} ${status}</div>
        <div>
          ${when(
            this.running,
            () => html`<vscode-spinner />`,
            () =>
              this.actions.map((a) => {
                return html`<dagger-button label=${a.label} @clicked="${this.onAction(a)}" />`
              }),
          )}
        </div>
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
