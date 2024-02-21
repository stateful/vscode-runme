import { Disposable } from 'vscode'
import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '../table'
import './ec2InstanceActions'
import { EC2Icon } from '../icons/ec2'
import { AWSActionType, AWSEC2Instance } from '../../../types'
import { formatDate, getContext } from '../../utils'
import { CloudShellIcon } from '../icons/cloudShell'
import { onClientMessage, postClientMessage } from '../../../utils/messaging'
import { ClientMessages } from '../../../constants'

enum MESSAGE_OPTIONS {
  Yes = 'Yes',
  No = 'No',
}

@customElement('ec2-instance-details')
export class EC2InstanceDetails extends LitElement implements Disposable {
  protected disposables: Disposable[] = []

  @property({ type: Object })
  instance!: AWSEC2Instance

  @property({ type: String })
  cellId!: string

  @property({ type: String })
  region!: string

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

    .instance-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      background-color: var(--vscode-editorWidget-background);
      border-bottom: solid 1px var(--vscode-editorWidget-border);
      padding: 10px;
    }

    .columns {
      display: flex;
      gap: 1;
      flex-wrap: wrap;
      align-content: stretch;
      justify-content: space-between;
      border-bottom: solid 1px var(--vscode-editorWidget-border);
      border-right: solid 1px var(--vscode-editorWidget-border);
    }

    .row {
      display: flex;
      flex-direction: column;
    }

    .column {
      padding: 10px;
      flex: 1;
      border-left: 1px solid var(--vscode-editorWidget-border);
    }

    .row div:first-child {
      font-weight: bold;
    }
  `

  private getId() {
    return `${this.cellId}-${this.instance.instanceId}`
  }

  private executeAction(action: AWSActionType) {
    const ctx = getContext()
    let title = ''
    switch (action) {
      case AWSActionType.ConnectViaSSH:
        title = `Do you want to connect via SSH to ${this.instance.name}`
    }
    return postClientMessage(ctx, ClientMessages.optionsMessage, {
      title,
      options: Object.values(MESSAGE_OPTIONS),
      modal: true,
      id: this.getId(),
      telemetryEvent: `app.aws.ec2InstanceDetails.${action}`,
    })
  }

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    this.disposables.push(
      onClientMessage(ctx, (e) => {
        if (![ClientMessages.onOptionsMessage].includes(e.type)) {
          return
        }

        if (e.type === ClientMessages.onOptionsMessage) {
          if (this.getId() !== e.output.id || !e.output.option) {
            return
          }

          if (e.output.option === MESSAGE_OPTIONS.Yes) {
            postClientMessage(ctx, ClientMessages.awsEC2InstanceAction, {
              cellId: this.cellId,
              instance: this.instance?.instanceId!,
              region: this.region,
              action: AWSActionType.ConnectViaSSH,
            })
          }
        }
      }),
    )
  }

  private renderInstance() {
    return html` <div>
      <div class="instance-header">
        <h2>Instance summary for ${this.instance.instanceId} (${this.instance.name})</h2>
        <vscode-button
          class="control"
          @click="${() => this.executeAction(AWSActionType.ConnectViaSSH)}"
          appearance="icon"
        >
          ${CloudShellIcon}
        </vscode-button>
      </div>
      <div class="columns">
        <div class="column">
          <div class="row">
            <div>Instance ID</div>
            <div>${this.instance.instanceId}</div>
          </div>
          <div class="row">
            <div>Launch time</div>
            <div>
              ${this.instance.launchTime ? formatDate(new Date(this.instance.launchTime)) : '-'}
            </div>
          </div>
          <div class="row">
            <div>IPv6 address</div>
            <div>-</div>
          </div>
          <div class="row">
            <div>Hostname type</div>
            <div>IP name: ${this.instance.PrivateDnsName}</div>
          </div>
          <div class="row">
            <div>Answer private resource DNS name</div>
            <div>IPv4 (A)</div>
          </div>
          <div class="row">
            <div>Auto-assigned IP address</div>
            <div>${this.instance.PublicIpAddress}[Public IP]</div>
          </div>
          <div class="row">
            <div>IAM Role</div>
            <div>-</div>
          </div>
          <div class="row">
            <div>IMDSv2</div>
            <div>Required</div>
          </div>
        </div>
        <div class="column">
          <div class="row">
            <div>Public IPv4 address</div>
            <div>${this.instance.publicIp}</div>
          </div>
          <div class="row">
            <div>Instance State</div>
            <div>${this.instance.instanceState}</div>
          </div>
          <div class="row">
            <div>Private IP DNS name (IPv4 only)</div>
            <div>${this.instance.PrivateDnsName}</div>
          </div>
          <div class="row">
            <div>Instance type</div>
            <div>${this.instance.InstanceType}</div>
          </div>
          <div class="row">
            <div>VPC ID</div>
            <div>${this.instance.VpcId}</div>
          </div>
          <div class="row">
            <div>Subnet ID</div>
            <div>${this.instance.SubnetId}</div>
          </div>
        </div>
        <div class="column">
          <div class="row">
            <div>Private IPv4 addresses</div>
            <div>${this.instance.publicIp}</div>
          </div>
          <div class="row">
            <div>Public IPv4 DNS</div>
            <div>${this.instance.PublicDnsName}</div>
          </div>
          <div class="row">
            <div>Elastic IP addresses</div>
            <div>-</div>
          </div>
          <div class="row">
            <div>Auto Scaling Group name</div>
            <div>-</div>
          </div>
        </div>
      </div>
    </div>`
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  render() {
    return html`<div class="integration">
        ${EC2Icon}
        <h3>AWS EC2 | Instance ${this.instance.name} | ${this.region}</h3>
      </div>
      ${this.renderInstance()}
      <div class="footer">
        <vscode-link
          class="link"
          href="${`https://${this.region}.console.aws.amazon.com/ec2/home?region=${this.region}#InstanceDetails:instanceId=${this.instance.instanceId}`}"
          >Details</vscode-link
        ><vscode-link
          class="link vertical-left-divider"
          href=${`https://${this.region}.console.aws.amazon.com/ec2/home?region=${this.region}#ManageInstanceState:instanceId=${this.instance.instanceId}`}
        >
          Manage state
        </vscode-link>
      </div>`
  }
}
