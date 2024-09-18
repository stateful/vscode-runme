import { Key } from 'webdriverio'

import {
  assertDocumentContainsSpinner,
  revertChanges,
  saveFile,
  updateLifecycleIdentitySetting,
} from '../../helpers/index.js'

async function reloadWindow() {
  const workbench = await browser.getWorkbench()
  await workbench.executeCommand('Developer: Reload Window')
}

async function removeAllNotifications() {
  const workbench = await browser.getWorkbench()
  const notifications = await workbench.getNotifications()
  await Promise.all(notifications.map((notification) => notification.dismiss()))
}

describe('Test suite: Empty file with setting None (0)', async () => {
  before(async () => {
    await removeAllNotifications()
  })

  it('open identity markdown file', async () => {
    await browser.executeWorkbench(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/tests/fixtures/identity/empty-file.md`),
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

  it('should not remove the front matter with the identity', async () => {
    const absDocPath = await browser.executeWorkbench(async (vscode, documentPath) => {
      return `${vscode.workspace.rootPath}${documentPath}`
    }, '/tests/fixtures/identity/empty-file.md')

    await updateLifecycleIdentitySetting(0)
    await reloadWindow()
    await saveFile(browser)
    await assertDocumentContainsSpinner(absDocPath, '', true)
  })

  after(() => {
    revertChanges('empty-file.md')
  })
})
