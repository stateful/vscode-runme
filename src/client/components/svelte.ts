import { html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { ViteOutput } from './vite'

@customElement('svelte-component')
export class SvelteComponent extends ViteOutput {
  // Render the UI as a function of component state
  render() {
    return html`<iframe src="about:blank"></iframe>`
  }

  protected firstUpdated() {
    // const originalContent = this.content
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
