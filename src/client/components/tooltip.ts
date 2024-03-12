import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

@customElement('tooltip-text')
export class Tooltip extends LitElement {
  @property({ type: String })
  tooltipText: string | undefined

  @property({ type: String })
  value: string | TemplateResult | undefined

  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    .tooltip .tooltiptext {
      background-color: var(--vscode-notifications-background);
      box-shadow: 2px 2px 4px -2px var(--vscode-notifications-border);
      display: none;
      padding: 5px;
      color: var(--vscode-notifications-foreground);
      border-radius: 5px;
      position: absolute;
      z-index: 100;
      box-shadow: rgba(0, 0, 0, 0.16) 0px 0px 8px 2px;
    }

    .tooltip .tooltiptext::after {
      content: ' ';
      position: absolute;
      bottom: 100%; /* At the top of the tooltip */
      left: 10px;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent var(--vscode-notifications-background) transparent;
    }

    .tooltip .tooltiptext {
      transition-delay: 1s;
    }

    .tooltip:hover .tooltiptext {
      display: block;
    }

    .tooltip:not(:hover) .tooltiptext {
      transition-delay: 0s;
    }
  `

  render() {
    return html`<div class="tooltip">
      <div
        .class="${when(
          this.classList,
          () => this.classList,
          () => '',
        )}"
      >
        ${this.value}
      </div>
      <div class="tooltiptext">${this.tooltipText}</div>
    </div>`
  }
}
