import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { Disposable } from 'vscode'

import { type GCPCluster } from '../../../../types'
import '../../table'
import { GCPIcon } from '../../icons/gcp'
import './clusterStatus'
import './cluster'
import { ClusterIcon } from '../../icons/cluster'
import { CloudLogsIcon } from '../../icons/cloudLogs'
import { ClientMessages } from '../../../../constants'
import { onClientMessage, postClientMessage } from '../../../../utils/messaging'
import { getContext } from '../../../utils'

enum MessageOptions {
  Yes = 'Yes',
  No = 'No',
}

const HIDDEN_COLUMNS = ['statusMessage', 'clusterId', 'clusterLink']
const COLUMNS = [
  {
    text: 'Status',
  },
  {
    text: 'Name',
  },
  {
    text: 'Location',
  },
  {
    text: 'Mode',
  },
  {
    text: 'Number of nodes',
  },
  {
    text: 'Total vCPUs',
  },
  {
    text: 'Total memory',
  },
  {
    text: 'Labels',
  },
  {
    text: 'Actions',
  },
]
@customElement('gcp-gke-clusters')
export class Clusters extends LitElement {
  protected disposables: Disposable[] = []

  @property({ type: Array })
  clusters!: GCPCluster[]

  @property({ type: String })
  cellId!: string

  @property({ type: String })
  projectId!: string

  @state()
  private _displayClusterInNewCell: boolean = true

  @state()
  private _selectedCluster: GCPCluster | null | undefined

  /* eslint-disable */
  static styles = css`
    vscode-button {
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      transform: scale(0.9);
    }
    vscode-button:hover {
      background: var(--vscode-list-hoverBackground);
    }
    table {
      box-sizing: border-box;
      margin: 0px;
      padding: 0px;
      font-weight: 400;
      line-height: 20px;
      text-indent: 0px;
      vertical-align: baseline;
    }

    .action-notice {
      position: relative;
      border-bottom: 2px solid var(--vscode-settings-rowHoverBackground);
      animation-name: action-notice;
      animation-duration: 2s;
      animation-iteration-count: 2;
    }

    @keyframes action-notice {
      0% {
        border-color: var(--vscode-settings-rowHoverBackground);
      }

      50% {
        border-color: var(--github-button-background);
      }

      100% {
        border-color: var(--vscode-settings-rowHoverBackground);
      }
    }

    .integration {
      display: flex;
      margin: 10px 0;
      gap: 2px;
      align-items: center;
    }

    .integration h1,
    h2,
    h3 {
      font-weight: 400;
    }

    .footer {
      display: flex;
      place-content: center flex-end;
      margin-top: 10px;
      align-items: baseline;
    }

    .footer .link {
      font-size: 10px;
      padding: 0 5px;
    }

    .vertical-left-divider {
      border-left: solid 1px var(--link-foreground);
      padding-left: 2px;
    }

    .close-button,
    .close-button:hover {
      border: none;
    }
  `

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    this.disposables.push(
      onClientMessage(ctx, (e) => {
        if (e.type === ClientMessages.onOptionsMessage) {
          if (this.cellId !== e.output.id || !e.output.option) {
            return
          }
          if (e.output.option === MessageOptions.No) {
            this._displayClusterInNewCell = false
            this.requestUpdate()
          } else {
            postClientMessage(ctx, ClientMessages.gcpClusterDetailsNewCell, {
              cellId: this.cellId,
              cluster: this._selectedCluster?.name!,
              location: this._selectedCluster?.location!,
              project: this.projectId,
            })
          }
        }
      }),
    )
  }

  private viewCluster(cluster: GCPCluster) {
    const ctx = getContext()
    this._selectedCluster = cluster
    return postClientMessage(ctx, ClientMessages.optionsMessage, {
      title: `Do you want to display the cluster details for ${cluster.name} in a separate cell?`,
      options: Object.values(MessageOptions),
      modal: true,
      id: this.cellId,
      telemetryEvent: 'app.gcp.cluster',
    })
  }

  private renderClusters() {
    return html` <div>
      <table-view
        .columns="${COLUMNS}"
        .rows="${this.clusters.map((cluster) => {
          return {
            status: cluster.status,
            statusMessage: cluster.statusMessage,
            name: cluster.name,
            location: cluster.location,
            mode: cluster.mode,
            nodes: cluster.nodes,
            vCPUs: cluster.vCPUs,
            memory: cluster.totalMemory,
            labels: cluster.labels,
            clusterId: cluster.clusterId,
            clusterLink: cluster.clusterLink,
            actions: [
              {
                name: 'Logs',
                render: () =>
                  html`<vscode-link
                    href="${`https://console.cloud.google.com/logs/query;query=%2528resource.type%3D%22k8s_cluster%22%2529%0Aresource.labels.cluster_name%3D%22${cluster.name}%22;?project=${this.projectId}`}"
                    >${CloudLogsIcon}</vscode-link
                  >`,
              },
              {
                name: 'Details',
                render: () =>
                  html`<vscode-button
                    class="control"
                    appearance="icon"
                    @click="${() => this.viewCluster(cluster)}"
                  >
                    ${ClusterIcon}
                  </vscode-button>`,
              },
            ],
          }
        })}"
        .displayable="${(row: GCPCluster, field: string) => {
          return !HIDDEN_COLUMNS.includes(field)
        }}"
        .renderer="${(row: GCPCluster, field: string) => {
          switch (field) {
            case 'name':
              return html`<vscode-link @click="${() => this.viewCluster(row)}"
                >${row[field]}</vscode-link
              >`
            case 'status':
              return html`<gcp-gke-cluster-status
                .cluster="${row}"
                .projectId="${this.projectId}"
                .cellId="${this.cellId}"
              ></gcp-gke-cluster-status>`
            case 'memory':
              return html`${row.mode === 'Standard' ? `${row[field]} Gb` : ''}`
            case 'labels':
              return html`${Object.keys(row[field]!).map(
                (key) =>
                  html`<vscode-badge class="label">${key}:${row[field]![key]}</vscode-badge>`,
              )}`
            case 'actions':
              return html`<div class="actions">
                ${row['actions'].map((action: any) => html`${action.render()}`)}
              </div>`
            default:
              return html`${row[field]}`
          }
        }}"
      ></table-view>
    </div>`
  }
  private resetSelectedCluster() {
    this._selectedCluster = null
    this._displayClusterInNewCell = true
  }

  render() {
    return html`<div class="integration">
        ${GCPIcon}
        <h3>Google Cloud Kubernetes Engine | Clusters</h3>
      </div>
      ${when(
        this._displayClusterInNewCell === false && this._selectedCluster,
        () =>
          html`<gcp-gke-cluster
            cellId=${this.cellId}
            .location="${this._selectedCluster?.location}"
            projectId="${this.projectId}"
            .cluster="${this._selectedCluster?.name!}"
            @onBack="${() => this.resetSelectedCluster()}"
          ></gcp-gke-cluster>`,
        () => this.renderClusters(),
      )}
      <div class="footer">
        <vscode-link
          class="link"
          href="${`https://console.cloud.google.com/kubernetes/list/overview?project=${this.projectId}`}"
          >${ClusterIcon}${this.projectId}</vscode-link
        ><vscode-link
          class="link vertical-left-divider"
          href=${`https://console.cloud.google.com/monitoring/dashboards/resourceList/kubernetes?project=${this.projectId}&pageState=(%22interval%22:())`}
        >
          View metrics
        </vscode-link>
        <vscode-link
          class="link vertical-left-divider"
          href="${`https://console.cloud.google.com/logs/query;query=%2528resource.type%3D%22k8s_cluster%22%2529?project=${this.projectId}`}"
          >View logs</vscode-link
        >
      </div>
      </div>
      `
  }
}
