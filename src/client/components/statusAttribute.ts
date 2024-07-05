import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable } from 'vscode'
import { when } from 'lit/directives/when.js'

import { PassIcon } from './icons/pass'
import { SyncIcon } from './icons/sync'
import { ErrorIcon } from './icons/error'
import { WarningIcon } from './icons/warning'
import { TrashIcon } from './icons/trash'
import { InfoIcon } from './icons/info'
import { UnknownIcon } from './icons/unknown'

@customElement('status-attribute')
export class StatusAttribute extends LitElement implements Disposable {
  protected disposables: Disposable[] = []

  @property({ type: String })
  status!: string

  /* eslint-disable */
  static styles = css`
    .status {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }

    .status-message {
      font-size: 10px;
    }
  `

  private statusIcon(icon: TemplateResult, label?: string | undefined) {
    return when(
      label,
      () => html`<div class="status">${icon}<span class="status-message">${label}</span></div>`,
      () => html`<div class="status">${icon}</div>`,
    )
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  render() {
    switch (this.status) {
      case 'STATUS_UNSPECIFIED':
        return this.statusIcon(UnknownIcon, 'Unknown')
      case 'PROVISIONING':
        return this.statusIcon(html`<span class="loading">${SyncIcon}</span>`, 'Provisioning')
      case 'RUNNING':
        return this.statusIcon(PassIcon)
      case 'RECONCILING':
        return this.statusIcon(
          html`<span class="loading">${SyncIcon}</span>${InfoIcon}`,
          'Reconciling',
        )
      case 'STOPPING':
        return this.statusIcon(
          html`<span class="loading">${SyncIcon}</span>${WarningIcon}`,
          'Stopping',
        )
      case 'ERROR':
        return this.statusIcon(ErrorIcon)
      case 'DEGRADED':
        return this.statusIcon(WarningIcon, 'Degraded')
      case 'STOPPED':
        return this.statusIcon(TrashIcon, 'Deleted')
    }
  }
}
