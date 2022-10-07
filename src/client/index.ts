import type { ActivationFunction } from 'vscode-notebook-renderer'

import { OutputType } from '../constants'
import type { CellOutput } from '../types'
import './components'

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

export const activate: ActivationFunction = () => ({
  renderOutputItem(outputItem, element) {
    const { output, type } = outputItem.json() as CellOutput
    switch (type) {
      case OutputType.shell:
        const shellElem = document.createElement('shell-output')
        shellElem.innerHTML = output
        element.appendChild(shellElem)
        break
      case OutputType.vercel:
        const vercelElem = document.createElement('vercel-output')
        vercelElem.setAttribute('content', JSON.stringify(output))
        element.appendChild(vercelElem)
        break
      case OutputType.deno:
        const denoElem = document.createElement('deno-output')
        denoElem.setAttribute('content', JSON.stringify(output))
        element.appendChild(denoElem)
        break
      case OutputType.html:
        const tag = output.isSvelte ? 'svelte-component' : 'vite-output'
        const viteElem = document.createElement(tag)
        viteElem.setAttribute('content', output.content)
        viteElem.setAttribute('port', output.port)
        element.appendChild(viteElem)
        break
      case OutputType.script:
        const iframe = document.createElement('iframe')
        const params = new URLSearchParams({
          code: output.code,
          ...output.attributes
        })
        const iframeSrc = `http://localhost:${output.port}/react.html?${params.toString()}`
        iframe.setAttribute('src', iframeSrc)
        iframe.setAttribute('style', 'width: 100%; border: 0;')

        element.appendChild(iframe)
        break
      case OutputType.error:
        element.innerHTML = /*html*/`⚠️ ${output}`
        break
      default: element.innerHTML = /*html*/`No renderer found!`
    }
  },
  disposeOutputItem(/* outputId */) {
    // Do any teardown here. outputId is the cell output being deleted, or
    // undefined if we're clearing all outputs.
  }
})
