import { PageDecorator, IPageDecorator, BasePage } from 'wdio-vscode-service'

export class Cell extends BasePage<{}, { cell: {} }> {
    public locatorKey = 'cell' as const
    #cellRow: WebdriverIO.Element
    constructor(cellRow: WebdriverIO.Element) {
        // TODO: Write the locator map
        super({ cell: {} })
        this.#cellRow = cellRow
    }

    async run() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.$('.run-button-container').click()
    }

    async getCellOutput(): Promise<string> {
        // TODO: Improve the selector and the name
        await browser.switchToParentFrame()
        const iframe = await $('iframe')
        await browser.switchToFrame(iframe!)
        const anotherIframe = await $('iframe')
        await browser.switchToFrame(anotherIframe!)

        const notebookTerminal = await $('terminal-view')
        const shellOutput = await $('shell-output')
        let terminalText = ''


        if (!notebookTerminal.error) {
            terminalText = await notebookTerminal.getText()
        }

        if (!shellOutput.error) {
            terminalText = await shellOutput.getText()
        }

        await browser.switchToParentFrame()
        await browser.switchToParentFrame()

        if (!terminalText.length) {
            throw new Error('Could not found an output')
        }

        return terminalText
    }
}
