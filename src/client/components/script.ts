import { customElement } from 'lit/decorators.js'
import { ViteOutput } from './vite'

console.log('REGISTER ME')

@customElement('script-output')
export class ScriptComponent extends ViteOutput {
  protected firstUpdated() {
    const script = this.content
    this.content = /*html*/`<script type="module">${script}</script>`
    console.log('YASS', this.content)

    super.firstUpdated()
  }
}
