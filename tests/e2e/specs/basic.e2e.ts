import { DefaultTreeItem } from 'wdio-vscode-service'
import { ElementArray, Key } from 'webdriverio'

enum OutputType {
  NotebookTerminal,
  ShellOutput
}

const getCell = async (content: string, rows: ElementArray): Promise<WebdriverIO.Element> => {
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
  return row
}

const executeCell = async (executionCell: WebdriverIO.Element) => {
  const container = await executionCell.parentElement().parentElement()
  await container.$('.run-button-container').click()
}

const switchToCellOutput = async () => {
  await browser.switchToParentFrame()
  const iframe = await $$('iframe')[0]
  await browser.switchToFrame(iframe!)
  const anotherIframe = await $$('iframe')[0]
  await browser.switchToFrame(anotherIframe!)

}

const getCellOutput = async () => {
  const notebookTerminal = await $('terminal-view')
  const shellOutput = await $('shell-output')

  if (!notebookTerminal.error) {
    return { outputType: OutputType.NotebookTerminal, outputReference: notebookTerminal }
  }

  if (!shellOutput.error) {
    return { outputType: OutputType.ShellOutput, outputReference: shellOutput }
  }

  throw new Error('Could not found an output')
}

const resolveCellOuput = async (cell: string): Promise<WebdriverIO.Element | undefined> => {
  const rows = await $$('.cell-editor-container')
  const row = await getCell(cell, rows)
  if (row) {
    await executeCell(row)
    await switchToCellOutput()
    const { outputType, outputReference } = await getCellOutput()
    switch (outputType) {
      case OutputType.NotebookTerminal:
        return outputReference.shadow$('#terminal')
      case OutputType.ShellOutput:
        return outputReference
      default: throw new Error('Invalid cell output')
    }
  }
}

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

    afterEach(async () => {
      const handle = await browser.getWindowHandle()
      return browser.switchToWindow(handle)
    })

    it('basic hello world shell execution', async () => {
      const outputReference = await resolveCellOuput('echo "Hello World!')
      expect(outputReference).toHaveText('Hello World!')
    })


    it('more shell example', async () => {
      const outputReference = await resolveCellOuput('echo "Foo 👀"\nsleep 2\necho "Bar 🕺"\nsleep 2\necho "Loo 🚀"')
      expect(outputReference).toHaveText('Foo 👀\nBar 🕺\nLoo 🚀')
    })

    it('background task example', async () => {
      const outputReference = await resolveCellOuput('sleep 100000')
      expect(outputReference).toHaveText('')
    })

    it('complex output', async () => {
      const outputReference = await resolveCellOuput('npm i -g webdriverio')
      if (outputReference) {
        const regex = new RegExp(/(added|changed) \d+ packages in \d+(?:ms|s)/)
        let expectedText = ''
        await browser.waitUntil(async () => {
          const text = await outputReference.getText()
          expectedText = text
          return regex.test(text)
        }, {
          timeout: 20000
        })
        return expect(outputReference).toHaveText(expectedText)
      }
    })


    it('stdin example', async () => {
      const outputReference = await resolveCellOuput('node ./scripts/stdin.js')
      if (outputReference) {
        const answer1 = 'I love it'
        const answer2 = 'Great'
        expect(outputReference).toHaveText('What do you think of Node.js?')
        await browser.keys([answer1, Key.Enter])
        await browser.keys([answer2, Key.Enter])
        expect(outputReference).toHaveText(`
        What do you think of Node.js? ${answer1}
        Thank you for your valuable feedback: ${answer1}
        Another question: how are you today? ${answer2}
        I am glad you are feeling: ${answer2}`)
      }
    })
  })

})
