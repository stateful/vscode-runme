import { DefaultTreeItem } from 'wdio-vscode-service'

import { Notebook } from '../pageobjects/notebook.page.js'



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

    it.skip('basic hello world shell execution', async () => {
      const cell = await notebook.getCell('echo "Hello World!')
      await cell.run()
      expect(await cell.getCellOutput()).toBe('Hello World!')
    })

    it('openssl test', async () => {
      const monaco = await $('.notebookOverlay .monaco-list-rows')
      // TODO: Move to the getCell method, scroll iteratively until finding the element
      const scrollCanvas = await $('.notebook-overview-ruler-container canvas')
      await scrollCanvas.click({
        y: 100
      })

      // If top position is not changing probably we didn't find the element.
      const top = await browser.execute((m: HTMLElement) => {
        return parseInt(m.style.top)
      }, monaco as any)
      
      const cell = await notebook.getCell('openssl rand -base64 32')
      await cell.run()
      const output = await cell.getCellOutput()
      console.log(output)
    })


    // it('more shell example', async () => {
    //   const outputReference = await resolveCellOuput('echo "Foo 👀"\nsleep 2\necho "Bar 🕺"\nsleep 2\necho "Loo 🚀"')
    //   expect(outputReference).toHaveText('Foo 👀\nBar 🕺\nLoo 🚀')
    // })

    // it('background task example', async () => {
    //   const outputReference = await resolveCellOuput('sleep 100000')
    //   expect(outputReference).toHaveText('')
    // })

    // it('complex output', async () => {
    //   const outputReference = await resolveCellOuput('npm i -g webdriverio')
    //   if (outputReference) {
    //     const regex = new RegExp(/(added|changed) \d+ packages in \d+(?:ms|s)/)
    //     let expectedText = ''
    //     await browser.waitUntil(async () => {
    //       const text = await outputReference.getText()
    //       expectedText = text
    //       return regex.test(text)
    //     }, {
    //       timeout: 20000
    //     })
    //     return expect(outputReference).toHaveText(expectedText)
    //   }
    // })


    // it('stdin example', async () => {
    //   const outputReference = await resolveCellOuput('node ./scripts/stdin.js')
    //   if (outputReference) {
    //     const answer1 = 'I love it'
    //     const answer2 = 'Great'
    //     expect(outputReference).toHaveText('What do you think of Node.js?')
    //     await browser.keys([answer1, Key.Enter])
    //     await browser.keys([answer2, Key.Enter])
    //     expect(outputReference).toHaveText(`
    //     What do you think of Node.js? ${answer1}
    //     Thank you for your valuable feedback: ${answer1}
    //     Another question: how are you today? ${answer2}
    //     I am glad you are feeling: ${answer2}`)
    //   }
    // })
  })

})
