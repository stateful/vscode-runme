import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('vscode-spinner')
export class VSCodeSpinner extends LitElement {
  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    .loader {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 16px 0 #fff, -16px 0 #fff;
      animation: flash 0.5s ease-out infinite alternate;
      display: inline-block;
      margin: 0 25px;
    }

    @keyframes flash {
      0% {
        background-color: #fff2;
        box-shadow: 16px 0 #fff2, -16px 0 #fff;
      }
      50% {
        background-color: #fff;
        box-shadow: 16px 0 #fff2, -16px 0 #fff2;
      }
      100% {
        background-color: #fff2;
        box-shadow: 16px 0 #fff, -16px 0 #fff2;
      }
    }
  `

  // Render the UI as a function of component state
  render() {
    return html`<span class="loader"></span>`
  }
}
