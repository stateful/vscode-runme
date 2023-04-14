import { BasePage } from 'wdio-vscode-service'
import { Key } from 'webdriverio'

import { Cell } from './cell.page.js'

export class Notebook extends BasePage<{}, { notebook: {} }> {
    public locatorKey = 'notebook' as const
    #monacoEditor: WebdriverIO.Element | undefined

    async findCell(content: string): Promise<Cell | undefined> {
        const rows = await $$('.cell-editor-container')
        let row: WebdriverIO.Element | undefined
        for (const r of rows) {
            const text = await r.getText()
            if (text.includes(content)) {
                row = r
                break
            }
        }
        if (!row) {
            return
        }
        return new Cell(row, content)
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
     * @param timeout The maximum amount of time to wait until finding the cell (1 minute by default)
     * @returns Found Cell or Error
     */
    async getCell(cellContent: string, timeout: number = 60000): Promise<Cell> {
        if (!this.#monacoEditor) {
            throw new Error('Missing Monaco editor instance, did you forget to run focusDocument?')
        }

        let cell: Cell | undefined
        let searchCell = true
        const startTime = new Date()
        while (searchCell && !cell) {
            cell = await this.findCell(cellContent)
            if (!cell) {
                const elapsedTime = (new Date().getTime() - startTime.getTime())
                if (elapsedTime > timeout) {
                    searchCell = false
                }
                await this.scrollDown(3)
            } else {
                searchCell = false
            }
        }
        if (!cell) {
            throw new Error(`Could not find cell with content ${cellContent}`)
        }
        return cell
    }

    async scrollDown(times: number = 1) {
        for (let i = 0; i < times; i++) {
            await browser.keys(Key.ArrowDown)
        }
    }

}   