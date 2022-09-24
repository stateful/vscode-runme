import type { ActivationFunction } from 'vscode-notebook-renderer'

import type { StdoutOutput } from '../types'
import './components'

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

export const activate: ActivationFunction = () => ({
  renderOutputItem(outputItem, element) {
    const { output } = outputItem.json() as StdoutOutput
    element.innerHTML = /*html*/`<shell-output content="${output}" />`
  },
  disposeOutputItem(/* outputId */) {
    // Do any teardown here. outputId is the cell output being deleted, or
    // undefined if we're clearing all outputs.
  }
})
