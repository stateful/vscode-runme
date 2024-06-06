import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Disposable } from 'vscode'
import { when } from 'lit/directives/when.js'

import { PassIcon } from '../icons/pass'
import { SyncIcon } from '../icons/sync'
import { ErrorIcon } from '../icons/error'
import { InfoIcon } from '../icons/info'
import { UnknownIcon } from '../icons/unknown'
import { SuspendedIcon } from '../icons/suspended'

@customElement('cluster-status')
export class ClusterStatus extends LitElement {
  protected disposables: Disposable[] = []

  @property({ type: String })
  status!: string

  @property({ type: Boolean })
  displayStatusText: boolean = false

  /* eslint-disable */
  static styles = css`
    .status {
      display: flex;
      align-items: center;
    }
  `

  private statusIcon(icon: TemplateResult, label: string) {
    return when(
      this.displayStatusText,
      () => html`<div class="status">${icon}<span class="status-message">${label}</span></div>`,
      () => html`<div class="status">${icon}</div>`,
    )
  }

  private mapClusterStatusIcon(status: string) {
    switch (status) {
      case 'PENDING':
        return this.statusIcon(UnknownIcon, 'Pending')
      case 'CREATING':
        return this.statusIcon(html`<span class="loading">${SyncIcon}</span>`, 'Creating')
      case 'ACTIVE':
        return this.statusIcon(PassIcon, 'Active')
      case 'UPDATING':
        return this.statusIcon(
          html`<span class="loading">${SyncIcon}</span>${InfoIcon}`,
          'Updating',
        )
      case 'FAILED':
        return this.statusIcon(ErrorIcon, 'Failed')
      case 'DELETING':
        return this.statusIcon(
          html`<span class="loading">${SyncIcon}</span>${SuspendedIcon}`,
          'Deleting',
        )
    }
  }

  render() {
    return html`${this.mapClusterStatusIcon(this.status)} `
  }
}
