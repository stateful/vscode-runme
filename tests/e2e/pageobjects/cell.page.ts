import { BasePage } from 'wdio-vscode-service'
import clipboard from 'clipboardy'

const DEFAULT_SEARCH_FOR_CELL_TIMEOUT = 50000

export enum OutputType {
    TerminalView = 'terminal-view',
    ShellOutput = 'shell-output',
    Display = '.display'
}

export enum StatusBarElements {
    Copy = 'Copy',
    Configure = 'Configure',
    CLI = 'CLI',
    ShellScript = 'Shell Script',
    OpenTerminal = 'Open Terminal',
    BackgroundTask = 'Background Task',
    StopTask = 'Stop Task'
}

export interface NotebookCommand {
    element$: WebdriverIO.Element
    text: string
}

export class Cell extends BasePage<{}, { cell: {} }> {
    public locatorKey = 'cell' as const
    #cellRow: WebdriverIO.Element
    #cellText: string
    constructor(cellRow: WebdriverIO.Element, cellText: string) {
        // TODO: Write the locator map
        super({ cell: {} })
        this.#cellRow = cellRow
        this.#cellText = cellText
    }

    /**
     * Ensure the focus is over the cell code block element
     */
    async focus() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.click()
    }

    async run() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.$('.run-button-container').click()
    }

    async openTerminal() {
        const commands = await this.getStatusBarElements()
        const terminal = commands.find((command) => command.text === 'Open Terminal')
        if (!terminal) {
            throw new Error('Could not find a terminal to open')
        }
        await terminal.element$.click()
    }

    /**
     * Checks if the specified output (a string or regular expression) is rendered
     * @param expectedOutput {string}
     * @param regex {RegExp}
     * @returns boolean
     */
    async cellOutputExists(expectedOutput: string, expectedTerminal: OutputType, regex?: RegExp): Promise<boolean> {
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
        let outputExists = false
        const rows = await $$(expectedTerminal)
        for (const row of rows) {
            if (row.error) {
                throw row.error
            }
            const text = !OutputType.Display ? await row.getText() : await row.getHTML(false)
            if (regex) {
                outputExists = regex.test(text)
            } else if (text.includes(expectedOutput)) {
                outputExists = true
            }
            if (outputExists) {
                break
            }
        }
        await browser.switchToParentFrame()
        await browser.switchToParentFrame()
        return outputExists
    }
}
