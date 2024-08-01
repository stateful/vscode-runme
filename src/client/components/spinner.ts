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
      background-color: var(--checkbox-background);
      box-shadow:
        16px 0 var(--checkbox-background),
        -16px 0 var(--checkbox-background);
      animation: flash 0.5s ease-out infinite alternate;
      display: inline-block;
      margin: 8px 25px;
    }

    @keyframes flash {
      0% {
        background-color: var(--checkbox-foreground);
        box-shadow:
          16px 0 var(--checkbox-foreground),
          -16px 0 var(--checkbox-background);
      }
      50% {
        background-color: var(--checkbox-background);
        box-shadow:
          16px 0 var(--checkbox-foreground),
          -16px 0 var(--checkbox-foreground);
      }
      100% {
        background-color: var(--checkbox-foreground);
        box-shadow:
          16px 0 var(--checkbox-background),
          -16px 0 var(--checkbox-foreground);
      }
    }
  `

  // Render the UI as a function of component state
  render() {
    return html`<span class="loader"></span>`
  }
}
