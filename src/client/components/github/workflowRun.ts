import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('github-workflow-run')
export class WorkflowRun extends LitElement {

    @property()
    status?: string

    @property()
    runNumber?: string

    @property()
    htmlUrl?: string

    @property()
    displayTitle?: string

    @property()
    avatarUrl?: string

    @property()
    githubUserName?: string

    static styles = unsafeCSS(require('!!raw-loader!./styles/workflowRun.css').default)

    render() {
        return html`
        <div class="workflow-run action-notice">
            <div class="icon icon-${this.status?.toLowerCase()}"></div>
            <div>${this.displayTitle} #${this.runNumber}: Manually run by
                <img class="avatar-user" src="${this.avatarUrl}" />
                ${this.githubUserName}
            </div>
            <div>
                <vscode-link href="${this.htmlUrl}">Open workflow run</vscode-link>
            </div>
        </div>
    `
    }
}
