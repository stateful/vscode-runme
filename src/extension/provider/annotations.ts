import vscode from 'vscode'

import { RunmeKernel } from '../kernel'
import { getMetadata } from '../utils'

export class AnnotationsProvider implements vscode.NotebookCellStatusBarItemProvider {
  #panel?: vscode.WebviewPanel
  constructor(private readonly runmeKernel: RunmeKernel) {
    vscode.commands.registerCommand('runme.openCellAnnotations', async (cell: vscode.NotebookCell) => {
      /**
       * close panel if already open
       */
      if (this.#panel) {
        this.#panel.dispose()
        this.#panel = undefined
        return
      }

      const metadata = getMetadata(cell)
      this.#panel = vscode.window.createWebviewPanel(
        'Webview',
        'Runme Cell',
        vscode.ViewColumn.Nine,
        { enableScripts: true }
      )
      this.#panel.webview.html = /*html*/`
      <script type="module">
        import {
          provideVSCodeDesignSystem,
          vsCodeCheckbox,
          vsCodeTextField
        } from 'https://esm.sh/@vscode/webview-ui-toolkit@1.2.1'

        provideVSCodeDesignSystem().register(
          vsCodeCheckbox(),
          vsCodeTextField()
        )
      </script>
      <h1>Runme Cell</h1>
      <vscode-checkbox ${metadata.background ? 'checked' : ''}>background</vscode-checkbox>
      <br />
      <vscode-checkbox ${metadata.interactive ? 'checked' : ''}>interactive</vscode-checkbox>
      <br />
      <vscode-checkbox ${metadata.closeTerminalOnSuccess ? 'checked' : ''}>close on success</vscode-checkbox>
      <hr style="display: block; height: 1px; border: 0; border-top: 1px solid rgba(255,255,255,.5); margin: 1em 0; padding: 0;" />
      <p><vscode-text-field value="${metadata.mimeType}">Mime Type</vscode-text-field></p>
      <p><vscode-text-field value="${metadata.name}" readonly>Cell ID</vscode-text-field></p>
      `
    })
  }

  async provideCellStatusBarItems(cell: vscode.NotebookCell): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    const item = new vscode.NotebookCellStatusBarItem(
      '$(output-view-icon) Annotations',
      vscode.NotebookCellStatusBarAlignment.Right
    )

    item.command = {
      title: 'Edit cell annotations',
      command: 'runme.openCellAnnotations',
      arguments: [cell],
    }
    return item
  }
}
