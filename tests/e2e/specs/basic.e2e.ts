import { DefaultTreeItem } from 'wdio-vscode-service'
import { Key } from 'webdriverio'
import clipboard from 'clipboardy'

import { Notebook } from '../pageobjects/notebook.page.js'
import { TerminalType } from '../pageobjects/cell.page.js'



describe('Runme VS Code Extension', async () => {
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
      if ((await r.getText()).includes('CLI')) {
        row = r
      }
    }

    if (!row) {
      throw new Error('Could not find CLI button')
    }
  })


  describe('Runme examples', async () => {
    const notebook = new Notebook({ notebook: {} })
    before(async () => {
      await notebook.focusDocument()
    })

    it('basic hello world shell execution', async () => {
      const cell = await notebook.getCell('echo "Hello World!')
      await cell.run()
      expect(await cell.cellOutputExists('Hello World!', TerminalType.ShellOutput)).toBe(true)
    })

    it('more shell example', async () => {
      const cell = await notebook.getCell('echo "Foo 👀"\nsleep 2\necho "Bar 🕺"\nsleep 2\necho "Loo 🚀"')
      await cell.run()
      await browser.pause(5000)
      expect(await cell.cellOutputExists('Foo 👀\nBar 🕺\nLoo 🚀', TerminalType.ShellOutput)).toBe(true)
    })


    it('background task example', async () => {
      const cell = await notebook.getCell('sleep 100000')
      await cell.run()
      expect(await cell.cellOutputExists('', TerminalType.ShellOutput)).toBe(true)
    })

    it('complex output', async () => {
      const cell = await notebook.getCell('npm i -g webdriverio')
      await cell.run()
      const regex = new RegExp(/(added|changed) \d+ packages in \d+(?:ms|s)/)
      let outputFound = false
      await browser.waitUntil(async () => {
        outputFound = await cell.cellOutputExists('added 244 packages in 12s', TerminalType.ShellOutput, regex)
        return outputFound === true
      }, {
        timeout: 20000
      })
      return expect(outputFound).toBe(true)
    })

    it('stdin example', async () => {
      const cell = await notebook.getCell('node ./scripts/stdin.js')
      await cell.run()
      const workbench = await browser.getWorkbench()
      const bottomBar = workbench.getBottomBar()
      await bottomBar.wait(1000)

      const answer1 = 'I love it, but there is deno'
      const answer2 = 'Great'
      await browser.keys([answer1, Key.Enter, answer2, Key.Enter])

      expect(await cell.isSuccessfulExecution()).toBe(true)
      await cell.openTerminal()
      await browser.pause(1000)
      await workbench.executeCommand('Terminal select all')
      await workbench.executeCommand('Copy')
      const text = await clipboard.read()
      await clipboard.write('')
      expect(text.includes(`What do you think of Node.js? ${answer1}`)).toBe(true)
      expect(text.includes(`Thank you for your valuable feedback: ${answer1}`)).toBe(true)
      expect(text.includes(`Another question: how are you today? ${answer2}`)).toBe(true)
      expect(text.includes(`I am glad you are feeling: ${answer2}`)).toBe(true)

      //Give back focus to the Notebook
      await notebook.focusDocument()
    })


    it('openssl test', async () => {
      const cell = await notebook.getCell('openssl rand -base64 32')
      await cell.run()
      const regex = /(?:[A-Za-z0-9+\/]{4}\\n?)*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)/
      expect(await cell.cellOutputExists('', TerminalType.ShellOutput, regex)).toBe(true)
    })
  })
})
