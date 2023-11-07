import { Key } from 'webdriverio'
import { InputBox } from 'wdio-vscode-service'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'

describe('Runme Frontmatter', async () => {
  const notebook = new RunmeNotebook()

  it('open category markdown file', async () => {
    await browser.executeWorkbench(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(
          `${vscode.workspace.rootPath}/examples/frontmatter/skipPrompts/DISABLED.md`,
        ),
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
    const cell = await notebook.getCell('export ENV="<insert-env-here>"')
    await cell.run(false)
    const workbench = await browser.getWorkbench()
    const inputBox = new InputBox(workbench.locatorMap)
    const placeholderChars = (await inputBox.getPlaceHolder()).length
    for (let index = 0; index < placeholderChars; index++) {
      await inputBox.clear()
    }
    await inputBox.setText('foo')
    // eslint-disable-next-line max-len
    const expectedMessage =
      // eslint-disable-next-line max-len
      "Your shell script wants to set some environment variables, please enter them here. (Press 'Enter' to confirm or 'Escape' to cancel)"
    expect(await inputBox.getTitle()).toBe('Set Environment Variable "ENV"')
    expect(await inputBox.getMessage()).toBe(expectedMessage)
    expect(await inputBox.getPlaceHolder()).toBe('<insert-env-here>')
    await inputBox.confirm()
  })
})
