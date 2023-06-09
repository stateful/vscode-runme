import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
@customElement('close-cell-button')
export class CloseCellButton extends LitElement {
  /* eslint-disable */
  static styles = css`
    :host {
      --button-icon-hover-background: var(--vscode-toolbar-hoverBackground);
      --tooltip-background: #343434;
    }

    .close-button .control {
      outline: none;
    }

    .close-button {
      position: absolute;
      top: 5px;
      right: 5px;
    }

    .close-button,
    .close-button:hover {
      border: none;
    }

    @media (prefers-color-scheme: light) {
      .icon-close {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.00028 8.70711L11.6467 12.3536L12.3538 11.6465L8.70739 8.00001L12.3538 4.35356L11.6467 3.64645L8.00028 7.2929L4.35384 3.64645L3.64673 4.35356L7.29317 8.00001L3.64673 11.6465L4.35384 12.3536L8.00028 8.70711Z' fill='%23424242'/%3E%3C/svg%3E%0A");
      }
    }

    @media (prefers-color-scheme: dark) {
      .icon-close {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.00004 8.70711L11.6465 12.3536L12.3536 11.6465L8.70714 8.00001L12.3536 4.35356L11.6465 3.64645L8.00004 7.2929L4.35359 3.64645L3.64648 4.35356L7.29293 8.00001L3.64648 11.6465L4.35359 12.3536L8.00004 8.70711Z' fill='%23C5C5C5'/%3E%3C/svg%3E%0A");
      }
    }

    .tooltip .tooltiptext {
      visibility: hidden;
      width: 50px;
      background-color: var(--tooltip-background);
      color: #fff;
      text-align: center;
      padding: 5px 0;
      position: absolute;
      z-index: 1;
      bottom: 150%;
      right: -60%;
      margin-left: -60px;
      top: 126%;
      height: 15px;
      box-shadow: 2px 2px 4px -2px var(--vscode-input-border);
    }

    .tooltip .tooltiptext::after {
      content: ' ';
      position: absolute;
      bottom: 100%; /* At the top of the tooltip */
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent var(--tooltip-background) transparent;
    }

    .tooltip .tooltiptext {
      transition-delay: 1s;
    }

    .tooltip:hover .tooltiptext {
      visibility: visible;
    }

    .tooltip:not(:hover) .tooltiptext {
      transition-delay: 0s;
    }
  `

  private onClose(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }
    const event = new CustomEvent('closed')
    this.dispatchEvent(event)
  }

  render() {
    return html`
      <div class="close-button tooltip">
        <span class="tooltiptext">Close</span>
        <vscode-button
          class="control"
          appearance="icon"
          aria-label="Close"
          @click="${this.onClose}"
        >
          <span class="icon icon-close"></span>
        </vscode-button>
      </div>
    `
  }
}
