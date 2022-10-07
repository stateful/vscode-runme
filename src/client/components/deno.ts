import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { Deployment, Project } from '../../utils/deno/api_types'

@customElement('deno-output')
export class DenoOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      display: block;
      font-family: Arial
    }

    section {
      padding: 10px;
      border: 1px solid #444;
      border-radius: 5px;
      display: flex;
      flex-direction: row;
      gap: 50px;
      align-items: flex-start;
    }

    img {
      width: 100px;
      padding: 20px;
    }

    h4 {
      margin-bottom: 0;
    }
  `

  // Declare reactive properties
  @property({ type: Object })
  content?: any

  // Render the UI as a function of component state
  render() {
    if (!this.content) {
      return html`⚠️ Ups! Something went wrong displaying the result!`
    }

    const deployed: boolean = this.content.deployed
    const project: Project = this.content.project
    const deployments: Deployment[] = this.content.deployments

    if (!project.name || (deployments ?? []).length < 0) {
      return html`Deploying to Deno...`
    }

    const deployment = deployments[0]
    const len = deployments.length
    const more = len > 1 ? deployments.slice(1, len-1) : []

    return html`<section>
      <img src="https://www.svgrepo.com/show/378789/deno.svg">
      <div>
        <h4>Deployment</h4>
        ${deployed ? html`
          <vscode-link href="https://${deployment.domainMappings[0].domain}">
            ${deployment.domainMappings[0].domain}
          </vscode-link>
        ` : html`Pending` }
        <h4>Project</h4>
        <vscode-link href="https://dash.deno.com/projects/${project.name}/deployments">${project.name}</vscode-link>
      </div>
      <div>
        <h4>Created At</h4>
        ${deployed ? (new Date(deployment.createdAt)).toString() : 'Pending' }
        <h4>Status</h4>
        ${deployed ?
          html`Ready <button>🚀 Promote to Prod</button>`
        : 'Deploying'}
      </div>
      ${more.forEach(m => {
        return html`<div>${m.domainMappings[0].domain}</div>`
      })}
    </section>`
  }
}
