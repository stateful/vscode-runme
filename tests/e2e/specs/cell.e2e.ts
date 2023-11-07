import fs from 'node:fs/promises'
import cp from 'node:child_process'

import { Key } from 'webdriverio'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import { Webview } from '../pageobjects/webview.page.js'

async function assertDocumentContains(documentPath: string, matcher: string) {
  const absDocPath = await browser.executeWorkbench(async (vscode, documentPath) => {
    return `${vscode.workspace.rootPath}${documentPath}`
  }, documentPath)
  const source = await fs.readFile(absDocPath, 'utf-8')
  await expect(source.toString()).toContain(matcher)
}

describe('Runme Cell Annotations', async () => {
  const notebook = new RunmeNotebook()
  const webview = new Webview()
  const token = process.env.RUNME_TEST_TOKEN

  before(async () => {
    await browser.executeWorkbench(async (vscode, accessToken) => {
      // @ts-expect-error inject test token
      globalThis._RUNME_TEST_TOKEN = { accessToken }
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/examples/test.md`),
      )
      return vscode.window.showNotebookDocument(doc, {
        viewColumn: vscode.ViewColumn.Active,
      })
    }, token)

    const workbench = await browser.getWorkbench()
    await workbench.executeCommand('Select Notebook Kernel')
    await browser.keys([Key.Enter])
  })

  describe('update cell name', () => {
    it('should be able to name a cell', async () => {
      await notebook.focusDocument()
      const cell = await notebook.getCell('echo "Hello World!"')
      await cell.elem.$('div=Configure').click()

      await webview.open()
      await expect($('edit-annotations')).toBePresent()
      await $('>>>#name').$('>>>input').setValue('HelloWorld')

      // annotation ux should still be visible even after using "o" character
      // that would usually collapse cell outputs
      await expect($('edit-annotations')).toBePresent()
      await webview.close()
    })

    it('propagates changes to markdown document', async () => {
      await browser.keys([Key.Ctrl, 's'])
      await assertDocumentContains('/examples/test.md', 'name=HelloWorld')
    })

    after(() => {
      return cp.exec('git checkout -- examples/test.md')
    })
  })
})
