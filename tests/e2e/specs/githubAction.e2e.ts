import { Key } from 'webdriverio'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import type { NotebookCell } from '../pageobjects/cell.page.js'

describe('Runme GitHub Workflow Integration', async () => {
  const notebook = new RunmeNotebook()
  const token = process.env.RUNME_TEST_TOKEN

  /**
   * Skip GitHub Action tests for local testing due to missing token
   */
  if ((!token && !process.env.CI) || process.env.NODE_ENV === 'production') {
    return
  }

  it('has GitHub test token defined in the environment', async () => {
    expect(token).toBeDefined()
  })

  it('open test markdown file', async () => {
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
  })

  describe('trigger workflow', () => {
    let cell: NotebookCell
    before(async () => {
      await notebook.focusDocument()
      cell = await notebook.getCell(
        'https://github.com/stateful/runme-canary/actions/workflows/test-inputs.yml',
      )
    })

    it('should open GitHub Action trigger view', async () => {
      await browser
        .action('key')
        .down(Key.Ctrl)
        .down(Key.Subtract)
        .pause(100)
        .down(Key.Ctrl)
        .down(Key.Subtract)
        .pause(100)
        .perform()
      await cell.run()
      await cell.switchIntoCellFrame()
      await expect($('>>>.github-workflow-item-container')).toBePresent()
    })

    it('should trigger GitHub Action', async () => {
      const outputContainer = $('>>>.github-workflow-item-container')
      await outputContainer.$('aria/Run Workflow').click()
      await outputContainer
        .$('github-workflow-run[status="queued"]')
        .waitForExist({ timeout: 10000 })
        // run again if workflow is not triggered
        .catch(() => outputContainer.$('aria/Run Workflow').click())
      await outputContainer
        .$('github-workflow-run[status="in_progress"]')
        .waitForExist({ timeout: 60000 })
      await outputContainer
        .$('github-workflow-run[status="completed"][conclusion="success"]')
        .waitForExist({ timeout: 60000 })
    })

    after(() => cell.switchOutOfCellFrame())
  })
})
