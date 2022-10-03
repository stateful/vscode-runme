import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('vercel-output')
export class VercelOutput extends LitElement {
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

  handleLogo() {
    const options = {
        detail: { name: 'logo' },
        bubbles: true,
        composed: true
      }
    this.dispatchEvent(new CustomEvent('logo', options))
  }

  // Render the UI as a function of component state
  render() {

    if (!this.content) {
      return html`⚠️ Ups! Something went wrong displaying the result!`
    }

    if (!this.content.name) {
      return html`Starting Vercel Deployment...`
    }

    return html`<section>
      <img src="https://www.svgrepo.com/show/354513/vercel-icon.svg" @click="${this.handleLogo}">
      <div>
        <h4>Deployment</h4>
        <vscode-link href="${this.content.inspectorUrl}">${this.content.url}</vscode-link>
        <h4>Name</h4>
        <vscode-link href="https://${this.content.name}.vercel.app">${this.content.name}</vscode-link>
      </div>
      <div>
        <h4>Created At</h4>
        ${(new Date(this.content.createdAt)).toString()}
        <h4>Status</h4>
        ${this.content.state.toLowerCase()}
      </div>
    </section>`
  }
}

@customElement('vercel-app')
export class VercelApp extends LitElement {
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

  _handleClick(project: any, branch: string) {
    const options = {
        detail: { project, command: 'redeploy', branch },
        bubbles: true,
        composed: true
      }
    this.dispatchEvent(new CustomEvent('project', options))
  }

  // Render the UI as a function of component state
  render() {

    if (!this.content) {
      return html`⚠️ Ups! Something went wrong displaying the result!`
    }

    if (this.content.length === 0) {
      return html`Fetching vercel sites`
    }

    return html`
      ${this.content.map((prj: any) => html`
      <section>
        <div>
          <h4>Name</h4>
          <vscode-link href="https://${prj.name}.vercel.app">${prj.name}</vscode-link>
        </div>
        <div>
          <h4>Created At</h4>
          ${(new Date(prj.createdAt)).toString()}
        </div>
        <select>
          <option>main</option><option>branch1</option><option>branch2</option>
        </select>
        <button @click="${() => this._handleClick(prj, 'main')}">Deploy</button>
      </section>`
      )}
    `
  }
}
