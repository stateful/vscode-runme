import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('shell-output')
export class ShellOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {}
  `

  // Declare reactive properties
  @property()
  content?: string

  // Render the UI as a function of component state
  render() {
    return html`<pre>${this.content}</p>`
  }
}
