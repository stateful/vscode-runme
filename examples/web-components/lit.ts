import { LitElement, css } from 'lit'
import { html } from 'lit-html'
import { customElement, property } from 'lit/decorators.js'

// Registers the element
@customElement('my-element')
export class MyElement extends LitElement {
  // Styles are applied to the shadow root and scoped to this element
  static styles = css`
    :host {
      color: white;
    }
    span {
      color: green;
    }
  `

  // Creates a reactive property that triggers rendering
  @property()
  mood = 'great'

  // Render the component's DOM by returning a Lit template
  render() {
    return html`Web Components are <span>${this.mood}</span>!`
  }
}
