import { DefaultTreeItem } from 'wdio-vscode-service'

describe('Runme VS Code Extension', () => {
  it('should load successfully', async () => {
    const workbench = await browser.getWorkbench()
    const title = await workbench.getTitleBar().getTitle()
    expect(title).toContain('README.md')
  })

  it('should re-open Readme.md and validate that it loads as notebook', async () => {
    const workbench = await browser.getWorkbench()
    const sidebar = await workbench.getSideBar()
    const content = await sidebar.getContent()
    const section = await content.getSection('VSCODE-RUNME')

    const filesAndDirs = await section.getVisibleItems() as DefaultTreeItem[]
    let readmeFile: DefaultTreeItem | undefined
    for (const file of filesAndDirs) {
      if (await file.getLabel() === 'README.md') {
        readmeFile = file
        break
      }
    }

    if (!readmeFile) {
      throw new Error('File with name "Readme.md" not found')
    }
    await readmeFile.select()

    await browser.waitUntil(
      async () => (await workbench.getAllWebviews()).length > 0,
      { timeoutMsg: 'Notebook document didn\'t load' }
    )
    const webview = (await workbench.getAllWebviews())[0]
    await webview.open()
    await expect($('body')).toHaveTextContaining('Runme Examples')
    await webview.close()
  })

  it('should provide a button to run cmd via CLI', async () => {
    const rows = await $$('.cell-statusbar-container .cell-status-item')
    let row: WebdriverIO.Element | undefined
    for (const r of rows) {
      const text = await r.getText()
      console.log(`Looking for CLI button: ${text}`)
      if (text.includes('CLI')) {
        row = r
      }
    }

    if (!row) {
      throw new Error('Could not find CLI button')
    }
  })

  it('should be able to run an example', async () => {
    const rows = await $$('.cell-editor-container')
    let row: WebdriverIO.Element | undefined
    for (const r of rows) {
      if ((await r.getText()).includes('"Foo 👀')) {
        row = r
      }
    }

    if (!row) {
      throw new Error('Could not find cell')
    }

    const container = await row.parentElement().parentElement()
    await container.$('.run-button-container').click()
  })

  it('should expected result in cell', async () => {
    const workbench = await browser.getWorkbench()
    const webview = (await workbench.getAllWebviews())[0]
    await webview.open()
    await expect($('.output_container').$('>>>pre')).toHaveText('Foo 👀\nBar 🕺\nLoo 🚀')
  })
})
