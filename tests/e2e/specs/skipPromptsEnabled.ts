import { Key } from 'webdriverio'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import { OutputType } from '../pageobjects/cell.page.js'

describe('Runme Frontmatter', async () => {
  const notebook = new RunmeNotebook()

  it('open category markdown file', async () => {
    await browser.executeWorkbench(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/examples/frontmatter/skipPrompts/ENABLED.md`),
      )
      return vscode.window.showNotebookDocument(doc, {
        viewColumn: vscode.ViewColumn.Active,
      })
    })
  })

  it('selects Runme kernel', async () => {
    const workbench = await browser.getWorkbench()
    await workbench.executeCommand('Select Notebook Kernel')
    await browser.keys([Key.Enter])
  })

  it('Should prompt user', async () => {
    await notebook.focusDocument()
    const exportEnvCell = await notebook.getCell('export ENV="dev"')
    await exportEnvCell.run()
    const echoCell = await notebook.getCell('echo $ENV')
    await echoCell.run()
    const result = await echoCell.getCellOutput(OutputType.ShellOutput)
    expect(result[0]).toBe('dev')
  })
})
