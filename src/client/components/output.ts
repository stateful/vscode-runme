import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('shell-output')
export class ShellOutput extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {}
  `

  // Render the UI as a function of component state
  render() {
    return html`<pre><slot></slot></pre>`
  }
}
