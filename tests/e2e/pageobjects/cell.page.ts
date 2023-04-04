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
     * Determines the output of a cell by identifying its successful execution status
     * @param expectedContent The content used to identify the location of the code cell.
     * @returns Promise<WebdriverIO.Element | undefined>
     */
    async #getCurrentExecutionRow(expectedContent?: string): Promise<WebdriverIO.Element | undefined> {
        const successRows = await browser.$$('.codicon-notebook-state-success')
        for await (const row of successRows) {
            const executionRow = await row
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
                .parentElement()
            const cellEditor = await executionRow.$('.cell-editor-container')
            const text = await cellEditor.getText()
            if (text === (expectedContent ?? this.#cellText)) {
                return executionRow
            }
        }
    }

    /**
     * Finds the cell status bar command elements
     * @returns Promise<NotebookCommand[]>
     */
    async #getStatusBarElements(): Promise<NotebookCommand[]> {
        const executionRow = await this.#getCurrentExecutionRow()
        const commands: NotebookCommand[] = []
        if (executionRow) {
            const statusBar$ = await executionRow.$('.cell-statusbar-container')
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
        }
        return commands
    }

    /**
     * Ensure the focus is over the cell code block element
     */
    async focus() {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.click()
    }

    /**
     * Clicks the Run cell button
     */
    async run(): Promise<void> {
        const container = await this.#cellRow.parentElement().parentElement()
        await container.$('.run-button-container').click()
    }

    /**
     * Opens the associated cell terminal by clicking Open Terminal command.
     */
    async openTerminal(): Promise<void> {
        const commands = await this.#getStatusBarElements()
        const terminal = commands.find((command) => command.text === 'Open Terminal')
        if (!terminal) {
            throw new Error('Could not find a terminal to open')
        }
        await terminal.element$.click()
    }

    /**
     * Check if there is an associated success status next to the code cell.
     * @param expectedContent {string} Override the cell text value in case
     * the output has some special formatting. (e.g remove new lines from multine content)
     * @returns Promise<boolean>
     */
    async isSuccessfulExecution(expectedContent?: string): Promise<boolean> {
        return Boolean(await this.#getCurrentExecutionRow(expectedContent))
    }

    /**
     * Checks if the specified output (a string or regular expression) is rendered
     * @param expectedOutput {string}
     * @param regex {RegExp}
     * @returns boolean
     */
    async cellOutputExists(expectedOutput: string, outputType: OutputType, regex?: RegExp): Promise<boolean> {
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
        const rows = await $$(outputType)
        for (const row of rows) {
            if (row.error) {
                throw row.error
            }
            const text = outputType !== OutputType.Display ? await row.getText() : await row.getHTML(false)
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

    /**
     * Access the terminal associated and retrieve the complete text that is 
     * displayed in the terminal window.
     * @param openTerminal {boolean} Indicate if the terminal should be opened (default: true)
     * @returns 
     */
    async getTerminalText(openTerminal: boolean = true): Promise<string> {
        const workbench = await browser.getWorkbench()
        if (openTerminal) {
            await this.openTerminal()
        }
        await workbench.executeCommand('Terminal select all')
        await workbench.executeCommand('Copy')
        const text = await clipboard.read()
        await clipboard.write('')
        await workbench.executeCommand('kill all terminals')
        return text
    }

    /**
     * Stalls until the success status check is detected
     * @param timeout {number} The maximum duration for waiting until it times out
     * @param expectedContent {string} Override the cell text value in case
     * the output has some special formatting. (e.g remove new lines from multine content)
     */
    async waitForCellOutput(expectedContent?: string | undefined, timeout?: number): Promise<void> {
        await browser.waitUntil(async () => {
            return (await this.isSuccessfulExecution(expectedContent)) === true
        }, {
            timeout: timeout ?? DEFAULT_SEARCH_FOR_CELL_TIMEOUT
        })
    }

    /**
     * Check if the specified list of commands are being rendered
     * @param elements List of elements to check
     * @returns {boolean}
     */
    async isStatusBarCommandsRendered(elements: StatusBarElements[]): Promise<boolean> {
        const renderedElements = await this.#getStatusBarElements()
        let missingElement = true
        for (const element of renderedElements) {
            if (!elements.includes(element.text as StatusBarElements)) {
                missingElement = true
                break
            }
        }
        return missingElement
    }

    /**
     * Checks if common rendered commands around cells are being rendered:
     *  - Copy
     *  - Configure
     *  - CLI
     *  - Shell Script
     * @param extraCommands Specify additional commands to check aside of the common ones for all rendered cells.
     * @returns { boolean }
     */
    async isCommonStatusBarCommandsRendered(extraCommands: StatusBarElements[] = []): Promise<boolean> {
        return this.isStatusBarCommandsRendered([
            StatusBarElements.Copy,
            StatusBarElements.Configure,
            StatusBarElements.CLI,
            StatusBarElements.ShellScript,
            ...extraCommands
        ])
    }
}
