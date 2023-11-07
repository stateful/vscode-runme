import { BasePage, IPageDecorator, PageDecorator } from 'wdio-vscode-service'
import { Key } from 'webdriverio'

import { NotebookCell } from './cell.page.js'
import * as locatorMap from './locators.js'
import { runmeNotebook as runmeNotebookLocators } from './locators.js'

export interface RunmeNotebook extends IPageDecorator<typeof locatorMap.runmeNotebook> {}

@PageDecorator(runmeNotebookLocators)
export class RunmeNotebook extends BasePage<typeof runmeNotebookLocators, typeof locatorMap> {
  public locatorKey = 'runmeNotebook' as const
  #monacoEditor: WebdriverIO.Element | undefined

  constructor() {
    super(locatorMap)
  }

  /**
   * Finds a cell by content
   * @param content {string} Keyword to use for searching a specific cell
   * @returns {Cell|undefined}
   */
  async findCell(content: string): Promise<NotebookCell | undefined> {
    const func = `
function() {
  const rows = this.querySelectorAll('.code-cell-row')
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const text = r.innerText
    if (text?.includes(${JSON.stringify(content.replaceAll(' ', '\xA0'))})) {
      return r
    }
  }
}
      `.trim()

    const passedFunc = function () {}
    passedFunc['toString'] = () => func

    const cell = new NotebookCell(this.elem.$(passedFunc as any), content)

    if (await cell.elem.isExisting()) {
      await cell.focus()
      return cell
    }
  }

  /**
   * Ensure the opened markdown file is focused.
   */
  async focusDocument(): Promise<void> {
    const documentFirstElement = await $('.notebook-folding-indicator')
    this.#monacoEditor = await $('.notebookOverlay .monaco-list-rows')
    if (!this.#monacoEditor || !documentFirstElement) {
      throw new Error('Could not find a valid Notebook element')
    }
    // Ensure focus over the document so we can navigate it
    await documentFirstElement.click()
  }

  /**
   * Find a Notebook cell by its content.
   * If the end of the Notebook is reached with no results,
   * it will throw an error.
   *
   * @param cellContent The content to use to find the cell
   * @param [timeout=60000] {number} The maximum amount of time to wait until finding the cell (1 minute by default)
   * @returns Found Cell or Error
   */
  async getCell(cellContent: string, timeout: number = 60000): Promise<NotebookCell> {
    if (!this.#monacoEditor) {
      throw new Error('Missing Monaco editor instance, did you forget to run focusDocument?')
    }

    let cell: NotebookCell | undefined
    const startTime = new Date()
    const workbench = await browser.getWorkbench()

    await workbench.executeCommand('notebook: focus first cell')

    while (!cell) {
      cell = await this.findCell(cellContent)
      // await workbench.executeCommand('focus next cell editor')
      await browser.keys(Key.ArrowDown)

      if (!cell) {
        const elapsedTime = new Date().getTime() - startTime.getTime()
        if (elapsedTime > timeout) {
          break
        }
      } else {
        break
      }
    }
    if (!cell) {
      throw new Error(`Could not find cell with content ${cellContent}`)
    }
    cell.focus()
    return cell
  }
}
