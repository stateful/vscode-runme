import { Key } from 'webdriverio'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import { clearAllOutputs, tryExecuteCommand } from '../helpers/index.js'
import { OutputType } from '../pageobjects/cell.page.js'

import { removeAllNotifications } from './notifications.js'

describe('Markdown runs without Runme frontmatter or cell metadata', async () => {
  const baseName = 'vscode-runme'
  before(async () => {
    await removeAllNotifications()
  })

  it('should load successfully', async () => {
    const workbench = await browser.getWorkbench()
    const title = await workbench.getTitleBar().getTitle()
    expect(title).toContain(baseName)
  })

  it('open bare markdown file', async () => {
    await browser.executeWorkbench(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/tests/fixtures/BARE.md`),
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

  describe('Run cells', async () => {
    const notebook = new RunmeNotebook()
    before(async () => {
      await notebook.focusDocument()
    })

    beforeEach(async () => {
      const workbench = await browser.getWorkbench()
      await workbench.executeCommand('Runme: Lifecycle Identity - None')
      await browser.pause(1500)
      await clearAllOutputs(workbench)
      await tryExecuteCommand(workbench, 'kill all terminals')
      await tryExecuteCommand(workbench, 'clear all notifications')
    })

    it('basic hello world, run twice back-to-back', async () => {
      const cell = await notebook.getCell('echo "Hello World!')

      // running 2x to avoid regression with terminal/process disposal
      await cell.run()
      await cell.run()

      expect(await cell.getCellOutput(OutputType.TerminalView)).toStrictEqual(['Hello World!'])
    })

    it('non-interactive echoing', async () => {
      const cell = await notebook.getCell(
        'echo "Foo 👀"\nsleep 2\necho "Bar 🕺"\nsleep 2\necho "Loo 🚀"',
      )
      await cell.run()
      expect(await cell.getCellOutput(OutputType.ShellOutput)).toStrictEqual([
        'Foo 👀\nBar 🕺\nLoo 🚀',
      ])
    })
  })
})
