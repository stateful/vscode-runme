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

    return html`<section>
      <img src="https://www.svgrepo.com/show/354513/vercel-icon.svg">
      <div>
        <h4>Deployment</h4>
        <a href="${this.content.payload.inspectorUrl}">${this.content.payload.url}</a>
        <h4>Name</h4>
        <a href="https://${this.content.payload.name}.vercel.app">${this.content.payload.name}</a>
      </div>
      <div>
        <h4>Created At</h4>
        ${(new Date(this.content.payload.createdAt)).toString()}
        <h4>Status</h4>
        ${this.content.payload.status}
      </div>
    </section>`
  }
}
