import fs from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'
import cp from 'node:child_process'

import { Key } from 'webdriverio'
import { QuickOpenBox } from 'wdio-vscode-service'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import { Webview } from '../pageobjects/webview.page.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

async function assertDocumentContains(documentPath: string, matcher: string) {
  const absDocPath = await browser.executeWorkbench(async (vscode, documentPath) => {
    return `${vscode.workspace.rootPath}${documentPath}`
  }, documentPath)
  const source = await fs.readFile(absDocPath, 'utf-8')
  await expect(await source.toString()).toContain(matcher)
}

async function removeAllNotifications() {
  const workbench = await browser.getWorkbench()
  const notifications = await workbench.getNotifications()
  await Promise.all(notifications.map((notification) => notification.dismiss()))
}

// TODO: Fix this test
describe.skip('Runme Categories Tests', async () => {
  const notebook = new RunmeNotebook()
  const webview = new Webview()
  const token = process.env.RUNME_TEST_TOKEN

  it('open category markdown file', async () => {
    await browser.executeWorkbench(async (vscode, accessToken) => {
      // @ts-expect-error inject test token
      globalThis._RUNME_TEST_TOKEN = { accessToken }
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(`${vscode.workspace.rootPath}/examples/CATEGORIES.md`),
      )
      return vscode.window.showNotebookDocument(doc, {
        viewColumn: vscode.ViewColumn.Active,
      })
    }, token)
  })

  it('selects Runme kernel', async () => {
    const workbench = await browser.getWorkbench()
    await workbench.executeCommand('Select Notebook Kernel')
    await browser.keys([Key.Enter])
  })

  it('populates defined categories in annotation view', async () => {
    await notebook.focusDocument()
    const cell = await notebook.getCell('echo "Hello I am excluded I won\'t show up with Run All!"')
    await cell.elem.$('div=Configure').click()

    await webview.open()
    await expect($('edit-annotations')).toBePresent()
    await $('>>>.annotation-container ').$('aria/ADVANCED').click()
    await expect($$('>>>.item-container')).toBeElementsArrayOfSize(1)
    await expect($$('>>>.item-container pre')).toHaveText('category-one')
  })

  describe('adding a category', () => {
    it('should appear a quicktext input when clicking on the add button', async () => {
      await $('>>>.category-button').click()
      await webview.close()

      const workbench = await browser.getWorkbench()
      const quickInput = new QuickOpenBox(workbench.locatorMap)
      expect(await quickInput.getTitle()).toBe('New cell execution category')
      expect(
        await quickInput.elem.$$('.monaco-list-row').map((row) => row.$('.label-name').getText()),
      ).toEqual(['category-one', 'category-two'])
    })

    it('should allow to add existing category', async () => {
      const workbench = await browser.getWorkbench()
      const quickInput = new QuickOpenBox(workbench.locatorMap)
      await quickInput.elem.$('=category-two').click()
      await browser.keys([Key.Enter])
      await removeAllNotifications()
      await webview.open()
      await expect($$('>>>.item-container')).toBeElementsArrayOfSize(2)
      await expect(await $$('>>>.item-container pre').map((elem) => elem.getText())).toEqual([
        'category-one',
        'category-two',
      ])
    })

    it('should not allow to add category with a space', async () => {
      await $('>>>.category-button').click()
      await webview.close()

      await browser.keys('some invalid category name')
      await browser.keys([Key.Enter])
      await removeAllNotifications()
      await webview.open()
      await expect($$('>>>.item-container')).toBeElementsArrayOfSize(2)
    })

    it('should not allow to add category with a comma', async () => {
      await $('>>>.category-button').click()
      await webview.close()

      await browser.keys('some,invalid,category,name')
      await browser.keys([Key.Enter])
      await removeAllNotifications()
      await webview.open()
      await expect($$('>>>.item-container')).toBeElementsArrayOfSize(2)
    })

    it('should allow to add a new category', async () => {
      await $('>>>.category-button').click()
      await webview.close()

      await browser.keys('category-three')
      await browser.keys([Key.Enter])
      await removeAllNotifications()
      await webview.open()
      await expect($$('>>>.item-container')).toBeElementsArrayOfSize(3)
      await expect(await $$('>>>.item-container pre').map((elem) => elem.getText())).toEqual([
        'category-one',
        'category-two',
        'category-three',
      ])
      await browser.keys([Key.Ctrl, 's'])
      await assertDocumentContains(
        '/examples/CATEGORIES.md',
        'category=category-one,category-two,category-three',
      )
    })
  })

  describe('update a category', () => {
    it('should allow to update a category', async () => {
      await $$('>>>.item-container pre')[0].parentElement().$('aria/Edit Category Item').click()
      $('>>>input[placeholder="category-one"]').addValue('-or-something-else')
      $('>>>vscode-button[appearance="primary"]').click()
      await browser.keys([Key.Enter])
      await expect(await $$('>>>.item-container pre').map((elem) => elem.getText())).toEqual([
        'category-one-or-something-else',
        'category-two',
        'category-three',
      ])
    })
  })

  describe('delete a category', () => {
    it('should allow to delete a category', async () => {
      await $$('>>>.item-container pre')[0].parentElement().$('aria/Remove Category Item').click()
      await expect(await $$('>>>.item-container pre').map((elem) => elem.getText())).toEqual([
        'category-two',
        'category-three',
      ])
      await browser.keys([Key.Ctrl, 's'])
      await assertDocumentContains(
        '/examples/CATEGORIES.md',
        'category=category-two,category-three',
      )
    })
  })

  after(() => {
    // revert changes we made during the test
    const mdPath = path.resolve(__dirname, '..', '..', '..', 'examples', 'CATEGORIES.md')
    cp.execSync(`git checkout -- ${mdPath}`)
  })
})
