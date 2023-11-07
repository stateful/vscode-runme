import { BasePage, IPageDecorator, PageDecorator } from 'wdio-vscode-service'
import { ChainablePromiseElement } from 'webdriverio'

import * as locatorMap from './locators.js'
import {
  notebookCell as notebookCellLocators,
  notebookCellStatus as notebookCellStatusLocators,
} from './locators.js'

export enum OutputType {
  TerminalView = 'terminal-view',
  ShellOutput = 'shell-output',
  Display = '.display',
}

export enum StatusBarElements {
  Copy = 'Copy',
  Configure = 'Configure',
  CLI = 'CLI',
  ShellScript = 'Shell Script',
  OpenTerminal = 'Open Terminal',
  BackgroundTask = 'Background Task',
  StopTask = 'Stop Task',
}

export interface NotebookCommand {
  element$: WebdriverIO.Element
  text: string
}

export interface NotebookCell extends IPageDecorator<typeof notebookCellLocators> {}

@PageDecorator(notebookCellLocators)
export class NotebookCell extends BasePage<typeof notebookCellLocators, typeof locatorMap> {
  public locatorKey = 'notebookCell' as const
  #cellText: string
  constructor(cellContainer: ChainablePromiseElement<WebdriverIO.Element>, cellText: string) {
    super(locatorMap, cellContainer)
    this.#cellText = cellText
  }

  /**
   * Ensure the focus is over the cell code block element
   */
  async focus() {
    await this.elem.click().catch(() => {
      // ci sometimes yaps about this
    })
  }

  async run(waitForSuccess = true) {
    const runButton = await this.runButton$
    await runButton.click()
    await browser.pause(100)

    if (waitForSuccess) {
      await this.getStatusBar().waitForSuccess()
    }
  }

  getStatusBar() {
    return new NotebookCellStatusBar(this.statusBar$, this)
  }

  async openTerminal() {
    const terminalButton = await this.getStatusBar().getCommand(StatusBarElements.OpenTerminal)
    await terminalButton.isClickable()
    await terminalButton.click()
  }

  async switchIntoCellFrame() {
    await browser.switchToParentFrame()
    const notebookIframe = await $('iframe')
    if (notebookIframe.error) {
      throw new Error('Could not find notebook iframe')
    }
    await browser.switchToFrame(notebookIframe)
    const executionIFrame = await $('iframe')
    if (executionIFrame.error) {
      throw new Error('Could not find execution iframe')
    }
    await browser.switchToFrame(executionIFrame)
  }

  async switchOutOfCellFrame() {
    await browser.switchToParentFrame()
    await browser.switchToParentFrame()
    await this.focus()
  }

  /**
   * Checks if the specified output (a string or regular expression) is rendered
   * @param expectedOutput {string}
   * @param regex {RegExp}
   * @returns boolean
   */
  async getCellOutput(expectedTerminal: OutputType): Promise<string[]> {
    await this.switchIntoCellFrame()
    const rows = await $$(expectedTerminal)
    const res: string[] = []
    for (const row of rows) {
      if (row.error) {
        throw row.error
      }
      let text =
        expectedTerminal !== OutputType.Display ? await row.getText() : await row.getHTML(false)

      if (expectedTerminal === OutputType.TerminalView) {
        text = text.slice(0, text.length - 'Copy\nSave'.length).trim()
      }

      res.push(text)
    }
    await this.switchOutOfCellFrame()
    return res
  }

  async getContainer() {
    return await this.elem
  }
}

export interface NotebookCellStatusBar extends IPageDecorator<typeof notebookCellStatusLocators> {}

@PageDecorator(notebookCellStatusLocators)
export class NotebookCellStatusBar extends BasePage<
  typeof notebookCellStatusLocators,
  typeof locatorMap
> {
  locatorKey = 'notebookCellStatus' as const

  constructor(
    container: ChainablePromiseElement<WebdriverIO.Element>,
    protected parentCell: NotebookCell,
  ) {
    super(locatorMap, container)
  }

  async getState(): Promise<'success' | 'failure' | undefined> {
    if (await this.success$.isExisting()) {
      return 'success'
    } else if (await this.failure$.isExisting()) {
      return 'failure'
    }
  }

  async waitForSuccess() {
    await this.parentCell.elem.isExisting()
    // console.log(await this.parentCell.elem.getText())
    await this.parentCell.focus()
    return this.success$.waitForExist({ timeout: 30000 })
  }

  getItems() {
    return this.item$$
  }

  getCommands() {
    return this.command$$
  }

  getCommand(test: StatusBarElements) {
    return $(`${this.locators.command}*=${test}`)
  }
}
