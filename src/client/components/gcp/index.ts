import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import './gke/clusters'
import './gke/cluster'
import './gce/vmInstances'
import { GCPSupportedView } from '../../../extension/resolvers/gcpResolver'
import { GCPState } from '../../../types'
import { RENDERERS } from '../../../constants'

@customElement(RENDERERS.GCPView)
export class GCPViews extends LitElement {
  @property({ type: Object })
  state:
    | GCPState
    /* eslint-disable */
    | undefined

  /* eslint-disable */
  static styles = css`
    table {
      box-sizing: border-box;
      margin: 0px;
      padding: 0px;
      font-weight: 400;
      line-height: 20px;
      text-indent: 0px;
      vertical-align: baseline;
    }
  `

  render() {
    switch (this.state?.view) {
      case GCPSupportedView.CLUSTERS:
        return html`<gcp-gke-clusters
          .clusters="${this.state.clusters || []}"
          cellId="${this.state.cellId}"
          projectId="${this.state.project!}"
        ></gcp-gke-clusters>`
      case GCPSupportedView.CLUSTER:
        return html`<gcp-gke-cluster
          .clusterData="${this.state.clusterDetails!}"
          cellId="${this.state.cellId}"
          .cluster="${this.state.cluster}"
          projectId="${this.state.project!}"
          .location="${this.state.location}"
        ></gcp-gke-cluster>`
      case GCPSupportedView.VM_INSTANCES:
        return html`<vm-instances
          .instances="${this.state.instances!}"
          cellId="${this.state.cellId}"
          projectId="${this.state.project!}"
        ></vm-instances>`
    }
  }
}
