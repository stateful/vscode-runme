import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import './actionButton'

@customElement('save-button')
export class SaveButton extends LitElement {
  @property({ type: Boolean, reflect: true })
  loading: boolean = false

  @property({ type: Boolean, reflect: true })
  signedIn: boolean = false

  @property({ type: String })
  platformId: string | undefined

  private handleClick(e: Event) {
    if (e.defaultPrevented) {
      e.preventDefault()
    }

    this.dispatchEvent(new CustomEvent('onClick'))
  }

  render() {
    let text = this.signedIn ? 'Save' : 'Save to cloud'
    if (this.platformId) {
      text = 'Share'
    }

    return html`
      <action-button
        ?loading=${this.loading}
        text="${text}"
        ?shareIcon=${!!this.platformId === true}
        ?saveIcon=${!!this.platformId === false}
        @onClick="${this.handleClick}"
      >
      </action-button>
    `
  }
}
