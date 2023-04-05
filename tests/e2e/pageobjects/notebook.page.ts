import { PageDecorator, IPageDecorator, BasePage } from 'wdio-vscode-service'
import { Cell } from './cell.page.js'

export class Notebook extends BasePage<{}, { notebook: {} }> {
    public locatorKey = 'notebook' as const

    async getCell(content: string): Promise<Cell> {
        const rows = await $$('.cell-editor-container')
        let row: WebdriverIO.Element | undefined
        for (const r of rows) {
            const text = await r.getText()
            if (text.includes(content)) {
                row = r
            }
        }
        if (!row) {
            throw new Error(`Could not find cell with content ${content}`)
        }
        return new Cell(row)
    }
    
}   