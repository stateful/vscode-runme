import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { RENDERERS } from '../../../constants'
import { AWSState } from '../../../types'
import { AWSSupportedView } from '../../../extension/resolvers/awsResolver'

import './ec2Instances'
import './ec2InstanceDetails'
import './eksClusters'

@customElement(RENDERERS.AWSView)
export class AWSViews extends LitElement {
  @property({ type: Object })
  state:
    | AWSState
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
      case AWSSupportedView.EC2Instances:
        return html`<ec2-instances
          .cellId="${this.state.cellId}"
          .instances="${this.state.instances}"
          .region="${this.state.region}"
        ></ec2-instances>`
      case AWSSupportedView.EC2InstanceDetails:
        return html`<ec2-instance-details
          .cellId="${this.state.cellId}"
          .instance="${this.state.instanceDetails!.instance || {}}"
          owner="${this.state.instanceDetails!.owner || '-'}"
          .region="${this.state.region}"
        ></ec2-instance-details>`
      case AWSSupportedView.EKSClusters:
        return html`<eks-clusters
          .cellId="${this.state.cellId}"
          .clusters="${this.state.clusters}"
          .cluster="${this.state.cluster}"
          .region="${this.state.region}"
        ></eks-clusters>`
    }
  }
}
