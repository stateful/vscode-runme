import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

import styles from './styles/loadingBar.css'

@customElement('loading-bar')
export class LoadingBar extends LitElement {
  /* eslint-disable */
  static styles = styles

  render() {
    return html` <div class="loading-bar"></div> `
  }
}
