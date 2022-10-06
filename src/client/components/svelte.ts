import { customElement } from 'lit/decorators.js'

import { ViteOutput } from './vite'

@customElement('svelte-component')
export class SvelteComponent extends ViteOutput {
  protected firstUpdated() {
    this.content = /*html*/`
      <div id="app"></div>
      <script type="module">
        import App from '/web-components/svelte/lib/Counter.svelte'
        const target = document.getElementById('app')
        new App({ target })
      </script>
    `
    super.firstUpdated()
  }
}
