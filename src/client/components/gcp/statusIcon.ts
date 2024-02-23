import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable } from 'vscode'
import { when } from 'lit/directives/when.js'

import { PassIcon } from '../icons/pass'
import { SyncIcon } from '../icons/sync'
import { ErrorIcon } from '../icons/error'
import { WarningIcon } from '../icons/warning'
import { TrashIcon } from '../icons/trash'
import { InfoIcon } from '../icons/info'
import { UnknownIcon } from '../icons/unknown'
import { StopIcon } from '../icons/stop'
import { SuspendedIcon } from '../icons/suspended'

@customElement('status-icon')
export class StatusIcon extends LitElement {
  protected disposables: Disposable[] = []

  @property({ type: String })
  status!: string

  /* eslint-disable */
  static styles = css`
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .loading {
      display: inline-block;
      height: 16px;
      width: 16px;
      animation: rotate 1s linear infinite;
    }

    .status {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      place-content: stretch space-evenly;
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

  private mapClusterStatusIcon(status: string) {
    console.log('received status', status)
    switch (status) {
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
      case 'STOPPED' /** Custom status to detect a removed resource */:
        return this.statusIcon(TrashIcon, 'Deleted')
      case 'TERMINATED':
        return this.statusIcon(StopIcon)
      case 'SUSPENDING':
        return this.statusIcon(
          html`<span class="loading">${SyncIcon}</span>${SuspendedIcon}`,
          'Suspending',
        )
      case 'SUSPENDED':
        return this.statusIcon(SuspendedIcon)
      case 'STAGING':
        return this.statusIcon(html`<span class="loading">${SyncIcon}</span>`, 'Starting')
    }
  }

  render() {
    return html`${this.mapClusterStatusIcon(this.status)} `
  }
}
