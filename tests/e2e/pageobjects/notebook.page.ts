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
     * @returns Found Cell or Error
     */
    async getCell(cellContent: string): Promise<Cell> {
        if (!this.#monacoEditor) {
            throw new Error('Missing Monaco editor instance, did you forget to run focusDocument?')
        }
        let endOfDocument = false
        let previousTopPosition
        let cell: Cell | undefined
        while (!endOfDocument) {
            cell = await this.findCell(cellContent)
            if (!cell) {
                await browser.keys(Key.ArrowDown)
                await browser.keys(Key.ArrowDown)
                await browser.keys(Key.ArrowDown)
                const documentTopPosition = await browser.execute((m: HTMLElement) => {
                    return parseInt(m.style.top)
                }, this.#monacoEditor as any as HTMLElement)
                if (documentTopPosition !== 0) {
                    if (previousTopPosition === documentTopPosition) {
                        endOfDocument = true
                    }
                    previousTopPosition = documentTopPosition
                }
            } else {
                endOfDocument = true
            }
        }
        if (!cell) {
            throw new Error(`Could not find cell with content ${cellContent}`)
        }
        return cell
    }

}   