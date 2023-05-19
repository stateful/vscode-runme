import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { Disposable } from 'vscode'

import type { ClientMessage, GitHubState } from '../../../types'
import { getContext } from '../../utils'
import { ClientMessages, RENDERERS } from '../../../constants'
import { onClientMessage } from '../../../utils/messaging'
import { IWorkflowRun } from '../../../extension/services/types'

import './workflowRun'

interface IWorkflow {
  on: any
  name: string
  jobs: any
}

type Event = {
  target: {
    id: string
    value: string
  }
}

enum DeploymentStatus {
  triggered,
  error,
  none
}

@customElement(RENDERERS.GitHubWorkflowViewer)
export class WorkflowViewer extends LitElement{

  @property()
  protected isTriggeringWorkflow = false

  @property()
  protected deploymentStatus: DeploymentStatus = DeploymentStatus.none

  @property()
  protected reason?: string

  @property()
  workflowRun?: IWorkflowRun

  @property({ type: Object })
  state: GitHubState = {}
  
  protected disposables: Disposable[] = []

  private inputs: Record<string, string> = {}

  static styles = unsafeCSS(require('!!raw-loader!./styles/workflowViewer.css').default)
  
  private renderSelect(group: string, groupLabel: string, options: string[]) {
    return html`
    <div class="dropdown-container">
    <label slot="label">${groupLabel}</label>
    <vscode-dropdown class="github-workflow-control">
      ${options.map((option: string) => {
      return html`<vscode-option
        value="${option}"
        @click=${(e: Event) => this.setControlValue(group, e)}>
        ${option}
        </vscode-option>`
    })}
    </vscode-dropdown>
    </div>
      `
  }

  private renderTextField(id: string, text: string, description: string = '', placeHolder: string = '') {
    return html`<vscode-text-field
      id="${id}"
      type="text"
      value="${text}"
      placeholder=${placeHolder}
      @change=${(e: Event) => this.setControlValue(id, e)}
      size="50"
      class="github-workflow-control"
    ><label>${description}</label></vscode-text-field>`
  }

  private setControlValue(key: string, e: Event) {
    this.inputs[key] = e.target.value
  }

  /**
   * Executes the GitHub Workflow
   */
  private async onRunWorkflow() {
    this.isTriggeringWorkflow = true
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
    const { owner, repo, workflow_id, ref } = this.state
    ctx.postMessage(<ClientMessage<ClientMessages.githubWorkflowDispatch>>{
      type: ClientMessages.githubWorkflowDispatch,
      output: { inputs: this.inputs, owner, repo, workflow_id, ref: ref ?? 'main' },
    })
  }

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    this.disposables.push(onClientMessage(ctx, (e) => {
      if (e.type === ClientMessages.githubWorkflowDeploy) {
        const { itFailed, reason, workflowRun } = e.output
        this.isTriggeringWorkflow = false
        this.deploymentStatus = itFailed ? DeploymentStatus.error : DeploymentStatus.triggered
        this.reason = reason
        this.workflowRun = workflowRun
      } else if (e.type === ClientMessages.githubWorkflowStatusUpdate) {
        const { workflowRun } = e.output
        this.workflowRun = workflowRun
      }
    })
    )
  }

  private getWorkflowForm() {
    const { on: { workflow_dispatch } } = this.state.content as unknown as IWorkflow
    if (workflow_dispatch) {
      const yamlDefinition = Object.entries(workflow_dispatch.inputs)
      const inputs = yamlDefinition.filter((p: unknown) => typeof p === 'object')
      return inputs.map((option: any) => {
        const [key, { type, options, description, default: defaultValue }] = option
        // Set the default values of the form
        this.inputs[key] = defaultValue
        return html`<div class="row">
          ${when(
          type === 'choice' && options.length <= 3,
          () => this.renderSelect(key, description, options),
          () => html``
        )}
          ${when(
          type === 'string',
          () => this.renderTextField(key, defaultValue, description),
          () => html``
        )}
        </div>`
      })
    }
  }

  private getWorkflowRunStatus() {
    return when(this.deploymentStatus === DeploymentStatus.triggered, () => {
      return html`
              <div class="message success-message">
                <h2>Workflow triggered!</h2>
                <p>The workflow is now running, the status will be updated automatically here.</p>
              </div>
              <github-workflow-run
                status="${this.workflowRun?.status}"
                runNumber="${this.workflowRun?.run_number}"
                htmlUrl="${this.workflowRun?.html_url}"
                displayTitle="${this.workflowRun?.display_title}"
                avatarUrl="${this.workflowRun?.actor.avatar_url}"
                githubUserName="${this.workflowRun?.actor.login}" />
              `
    }, () => html``)
  }

  private getFooter() {
    return html`
      <div class="run-action-footer ${this.isTriggeringWorkflow ? 'deploying': ''}">
        ${when(
      this.isTriggeringWorkflow,
      () => html`<vscode-progress-ring></vscode-progress-ring><p>Triggering workflow...</p>`,
      () => html`
            <vscode-button 
                style="color: var(--vscode-button-foreground);
                background-color:var(--github-button-background);"
                @click="${this.onRunWorkflow}">
                Run Workflow
            </vscode-button>`
    )} 
    </div>`
  }

  // Render the UI as a function of component state
  render() {
    const workflowForm = this.getWorkflowForm()
    if (workflowForm) {
      return html`
      <div class="github-workflow-item-container ${this.isTriggeringWorkflow ? 'fade' : ''}">
        ${this.getWorkflowRunStatus()}
        ${when(this.deploymentStatus === DeploymentStatus.error,
        () => html`<div class="message error-message">Failed to trigger workflow:${this.reason}</div>`,
        () => html``)}
        <div class="github-workflow-container">
          ${workflowForm}
        </div>
        ${this.getFooter()}
      </div>
      `
    }

    return html`
    <div class="message error-message"><h2>Error</h2>
      <p>Unsupported GitHub Workflow, please ensure you are specifying an action with workflow_dispatch</p>
    </div>`
  }

}
