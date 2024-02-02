import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import './clusters'
import './cluster'
import { GKESupportedView } from '../../../extension/resolvers/gkeResolver'
import { GKEState } from '../../../types'
import { RENDERERS } from '../../../constants'

@customElement(RENDERERS.GKEView)
export class Clusters extends LitElement {
  @property({ type: Object })
  state:
    | GKEState
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
      case GKESupportedView.CLUSTERS:
        return html`<gke-clusters
          .clusters="${this.state.clusters || []}"
          cellId="${this.state.cellId}"
          projectId="${this.state.project!}"
        ></gke-clusters>`
      case GKESupportedView.CLUSTER:
        return html`<gke-cluster
          .clusterData="${this.state.clusterDetails!}"
          cellId="${this.state.cellId}"
          .cluster="${this.state.cluster}"
          projectId="${this.state.project!}"
          .location="${this.state.location}"
        ></gke-cluster>`
    }
  }
}
