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

  // Render the UI as a function of component state
  render() {
    if (!this.content) {
      return html`⚠️ Ups! Something went wrong displaying the result!`
    }

    if (!this.content.payload.name) {
      return html`Starting Vercel Deployment...`
    }

    return html`<section>
      <img src="https://www.svgrepo.com/show/354513/vercel-icon.svg">
      <div>
        <h4>Inspect Deployment</h4>
        <vscode-link href="${this.content.payload.inspectorUrl}">${this.content.payload.inspectorUrl}</vscode-link>
        <h4>Project Name</h4>
        ${this.content.payload.name}
        <h4>Url</h4>
        ${this.content.payload.alias.map((url: string) => /*html*/html`
          <vscode-link href="https://${url}">${url}</vscode-link><br />
        `)}
      </div>
      <div>
        <h4>Created At</h4>
        ${(new Date(this.content.payload.createdAt)).toString()}
        <h4>Status</h4>
        ${this.content.payload.status.toLowerCase()}
      </div>
    </section>`
  }
}
