import { BasePage } from 'wdio-vscode-service'

export enum OutputType {
    TerminalView = 'terminal-view',
    ShellOutput = 'shell-output',
    Display = '.display'
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

    async focus() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.click()
    }

    async run() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.$('.run-button-container').click()
    }

    async getStatusBarElements(): Promise<NotebookCommand[]> {
        const successStateRows = await browser.$$('.codicon-notebook-state-success')
        let commands: NotebookCommand[] = []

        for await (const row of successStateRows) {
            const parent = await row
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
            const cellEditorContainer = await parent.$('.cell-editor-container')
            if (await cellEditorContainer.getText() === this.#cellText) {
                const statusBar$ = await parent.$('.cell-statusbar-container')
                const statusRight$ = await statusBar$.$('.cell-status-right')
                const contributedRight$ = await statusRight$.$('.cell-contributed-items-right')
                const commandsResult$$ = await contributedRight$.$$('.cell-status-item-has-command')

                for await (const row of commandsResult$$) {
                    const text = await row.getText()
                    commands.push({
                        element$: row,
                        text: text.trim()
                    })
                }
                break
            }
        }

        return commands
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
     * Check if there is an associated success status next to the code cell.
     * @returns Promise<boolean>
     */
    async isSuccessfulExecution(): Promise<boolean> {
        const successRows = await browser.$$('.codicon-notebook-state-success')
        let cellExists = false
        for await (const row of successRows) {
            const executionRow = await row
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
            const cellEditor = await executionRow.$('.cell-editor-container')
            const text = await cellEditor.getText()
            if (text === this.#cellText) {
                cellExists = true
                break
            }
        }
        return cellExists
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
