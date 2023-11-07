import { PageDecorator, IPageDecorator, BasePage } from 'wdio-vscode-service'

import * as locatorMap from './locators.js'
import { webview as webviewLocators } from './locators.js'

export interface Webview extends IPageDecorator<typeof webviewLocators> {}
@PageDecorator(webviewLocators)
export class Webview extends BasePage<typeof webviewLocators, typeof locatorMap> {
  /**
   * @private locator key to identify locator map (see locators.ts)
   */
  public locatorKey = 'webview' as const

  constructor() {
    super(locatorMap)
  }

  public async open() {
    await this.outerFrame$.waitForExist()
    await browser.switchToFrame(await this.outerFrame$)
    await this.innerFrame$.waitForExist()
    const webviewInner = await browser.findElement('css selector', this.locators.innerFrame)
    await browser.switchToFrame(webviewInner)
  }

  public async close(closeTab?: boolean) {
    await browser.switchToFrame(null)
    await browser.switchToFrame(null)

    if (closeTab) {
      const workbench = await browser.getWorkbench()
      const editorView = await workbench.getEditorView()
      await editorView.closeEditor('Marquee')
    }
  }
}
