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

    const deployUrl = this.content.outputItems.find((item: string) => item.indexOf('vercel.app') > -1)
    if (!deployUrl) {
      return html`Starting Vercel Deployment`
    }

    return html`<section>
      <img src="https://www.svgrepo.com/show/354512/vercel.svg">
      <div>
        <h4>Deployment</h4>
        <vscode-link href="${deployUrl}">${deployUrl}</vscode-link>
        <h4>Project Name</h4>
        ${deployUrl}
      </div>
      <div>
        <h4>Output</h4>
        ${this.content.outputItems.join('\n')}
      </div>
    </section>`
  }
}
