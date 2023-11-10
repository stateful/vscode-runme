import url from 'node:url'
import path from 'node:path'
import cp from 'node:child_process'

import { Key } from 'webdriverio'

import { assertDocumentContains, updateSettings } from './utils.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

async function reloadWindow() {
  const workbench = await browser.getWorkbench()
  await workbench.executeCommand('Developer: Reload Window')
}

async function removeAllNotifications() {
  const workbench = await browser.getWorkbench()
  const notifications = await workbench.getNotifications()
  await Promise.all(notifications.map((notification) => notification.dismiss()))
}

describe('Test suite: Empty file with setting Document (2)', async () => {
  before(async () => {
    await removeAllNotifications()
  })

  it('open identity markdown file', async () => {
    await browser.executeWorkbench(async (vscode) => {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/examples/identity/empty-file.md`),
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
    }, '/examples/identity/empty-file.md')

    await updateSettings({ setting: 'runme.server.persistIdentity', value: 2 })
    await reloadWindow()
    await browser.keys([Key.Command, 's'])
    await assertDocumentContains(absDocPath, '')
  })

  after(() => {
    //revert changes we made during the test
    const mdPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'examples',
      'identity',
      'empty-file.md',
    )
    cp.execSync(`git checkout -- ${mdPath}`)
  })
})
