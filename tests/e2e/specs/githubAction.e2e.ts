import { Key } from 'webdriverio'

import { RunmeNotebook } from '../pageobjects/notebook.page.js'
import type { NotebookCell } from '../pageobjects/cell.page.js'

const UI_LATENCY_TIMEOUT_SECS = 2 * 60 * 1000

describe('Runme GitHub Workflow Integration', async () => {
  const notebook = new RunmeNotebook()
  const token = process.env.RUNME_TEST_TOKEN || ''
  const actor = process.env.GITHUB_ACTOR
  const eventName = process.env.GITHUB_EVENT_NAME
  const baseOwner = process.env.BASE_OWNER || ''
  const forkOwner = process.env.FORK_OWNER || ''

  /**
   * Skip GitHub Action tests for local testing due to missing token
   */
  if (
    (!token && !process.env.CI) ||
    process.env.NODE_ENV === 'production' ||
    actor === 'dependabot[bot]'
  ) {
    return
  }

  // Skip tests only if PR is from external fork
  if (eventName === 'pull_request' && forkOwner !== baseOwner) {
    console.log('Skipping GitHub Workflow Integration tests for pull request from external fork.')
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
      const workbench = await browser.getWorkbench()
      await workbench.executeCommand('clear all notifications')
      cell = await notebook.getCell(
        'https://github.com/stateful/vscode-runme/actions/workflows/test-inputs.yml',
      )
    })

    it('should open GitHub Action trigger view', async () => {
      await cell.run()
      await cell.switchIntoCellFrame()
      await browser
        .action('key')
        .down(Key.Ctrl)
        .down(Key.Subtract)
        .pause(100)
        .down(Key.Ctrl)
        .down(Key.Subtract)
        .pause(100)
        .perform()
      await expect($('>>>.github-workflow-item-container')).toBePresent()
    })

    it('should trigger GitHub Action', async () => {
      const outputContainer = $('>>>.github-workflow-item-container')
      await outputContainer.$('aria/Run Workflow').click()
      await outputContainer
        .$('github-workflow-run[status="queued"]')
        .waitForExist({ timeout: UI_LATENCY_TIMEOUT_SECS })
        // run again if workflow is not triggered
        .catch(() => outputContainer.$('aria/Run Workflow').click())
      await outputContainer
        .$('github-workflow-run[status="in_progress"]')
        .waitForExist({ timeout: UI_LATENCY_TIMEOUT_SECS })
      await outputContainer
        .$('github-workflow-run[status="completed"][conclusion="success"]')
        .waitForExist({ timeout: UI_LATENCY_TIMEOUT_SECS })
    })

    after(() => cell.switchOutOfCellFrame())
  })
})
