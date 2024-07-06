import { Disposable } from 'vscode'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { protos } from '@google-cloud/compute'

@customElement('vm-instance')
export class VMInstance extends LitElement implements Disposable {
  protected disposables: Disposable[] = []

  @property({ type: Object })
  instance!: protos.google.cloud.compute.v1.IInstance

  @property({ type: String })
  cellId!: string

  @property({ type: String })
  projectId!: string

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  render() {
    return html`<div>${JSON.stringify(this.instance)}</div>`
  }
}
