import { DefaultTreeItem } from 'wdio-vscode-service'
import { Key } from 'webdriverio'
import clipboard from 'clipboardy'

import { Notebook } from '../pageobjects/notebook.page.js'
import { OutputType } from '../pageobjects/cell.page.js'



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
      const workbench = await browser.getWorkbench()
      await workbench.executeCommand('clear all notifications')
    })

    it('basic hello world shell execution', async () => {
      const cell = await notebook.getCell('echo "Hello World!')
      await cell.run()
      expect(await cell.cellOutputExists('Hello World!', OutputType.ShellOutput)).toBe(true)
    })

    it('more shell example', async () => {
      const cell = await notebook.getCell('echo "Foo 👀"\nsleep 2\necho "Bar 🕺"\nsleep 2\necho "Loo 🚀"')
      await cell.run()
      await browser.pause(5000)
      expect(await cell.cellOutputExists('Foo 👀\nBar 🕺\nLoo 🚀', OutputType.ShellOutput)).toBe(true)
    })


    it('background task example', async () => {
      const cell = await notebook.getCell('sleep 100000')
      await cell.run()
      expect(await cell.cellOutputExists('', OutputType.ShellOutput)).toBe(true)
      await cell.focus()
    })

    // TODO: Review why this is failing
    it.skip('complex output', async () => {
      const cell = await notebook.getCell('npm i -g webdriverio')
      await cell.run()
      const regex = new RegExp(/(added|changed) \d+ packages in \d+(?:ms|s)/)
      let outputFound = false
      await browser.waitUntil(async () => {
        outputFound = await cell.cellOutputExists('added 244 packages in 12s', OutputType.ShellOutput, regex)
        return outputFound === true
      }, {
        timeout: 30000
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
      await browser.keys(Key.ArrowDown)
      await cell.openTerminal()
      await workbench.executeCommand('Terminal select all')
      await workbench.executeCommand('Copy')
      const text = await clipboard.read()
      await clipboard.write('')
      expect(text.includes(`What do you think of Node.js? ${answer1}`)).toBe(true)
      expect(text.includes(`Thank you for your valuable feedback: ${answer1}`)).toBe(true)
      expect(text.includes(`Another question: how are you today? ${answer2}`)).toBe(true)
      expect(text.includes(`I am glad you are feeling: ${answer2}`)).toBe(true)
      await workbench.executeCommand('kill all terminals')
    })

    it('single line environment variable', async () => {
      const cell = await notebook.getCell('export DENO_ACCESS_TOKEN="<insert-token-here>"')
      await cell.run()
      await browser.keys(['token', Key.Enter])
      await browser.pause(1000)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('verify single line environment variable', async () => {
      const cell = await notebook.getCell('echo "DENO_ACCESS_TOKEN: $DENO_ACCESS_TOKEN"')
      await cell.run()
      await browser.keys(Key.ArrowDown)
      expect(await cell.cellOutputExists('DENO_ACCESS_TOKEN: token', OutputType.ShellOutput)).toBe(true)
    })

    it('multiple lines environment variable', async () => {
      const lines = [
        'echo "Auth token for service foo"',
        'export SERVICE_FOO_TOKEN="foobar"',
        'echo "Auth token for service bar"',
        'export SERVICE_BAR_TOKEN="barfoo"'
      ]
      const cell = await notebook.getCell(lines.join('\n'))
      await cell.run()
      await browser.keys(Key.Enter)
      await browser.keys(Key.Enter)
      await browser.keys(Key.ArrowDown)
      await browser.pause(1000)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('verify multiple lines environment variable', async () => {
      const lines = [
        'echo "SERVICE_FOO_TOKEN: $SERVICE_FOO_TOKEN"',
        'echo "SERVICE_BAR_TOKEN: $SERVICE_BAR_TOKEN"'
      ]
      const outputLines = [
        'SERVICE_FOO_TOKEN: foobar',
        'SERVICE_BAR_TOKEN: barfoo'
      ]
      const cell = await notebook.getCell(lines.join('\n'))
      await cell.run()
      await browser.keys(Key.ArrowDown)
      await browser.pause(1000)
      expect(await cell.cellOutputExists(outputLines.join('\n'), OutputType.ShellOutput)).toBe(true)
    })

    it('support changes to $PATH', async () => {
      const cell = await notebook.getCell('export PATH="/some/path:$PATH"\necho $PATH')
      await cell.run()
      await browser.pause(1000)
      await browser.keys(Key.Enter)
      await browser.keys(Key.ArrowDown)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('support piping content to an environment variable', async () => {
      const cell = await notebook.getCell('export LICENSE=$(cat ../LICENSE)')
      await cell.run()
      await browser.pause(1000)
      await browser.keys(Key.ArrowDown)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('verify piping content to an environment variable', async () => {
      const cell = await notebook.getCell('echo "LICENSE: $LICENSE"')
      await cell.run()
      await browser.pause(1000)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    // TODO: Review why is this failing
    it.skip('support for multiline exports', async () => {
      const lines = [
        'export PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----',
        'MIIEpAIBAAKCAQEA04up8hoqzS1+',
        '...',
        'l48DlnUtMdMrWvBlRFPzU+hU9wDhb3F0CATQdvYo2mhzyUs8B1ZSQz2Vy==',
        '-----END RSA PRIVATE KEY-----'

      ]
      const cell = await notebook.getCell(lines.join('\n'))
      await cell.run()
      await browser.keys(Key.ArrowDown)
      await browser.pause(5000)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('verify for multiline exports', async () => {
      const cell = await notebook.getCell('echo "PRIVATE_KEY: $PRIVATE_KEY"')
      await cell.run()
      await browser.pause(1000)
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })


    it('copy from result cell', async () => {
      const cell = await notebook.getCell('openssl rand -base64 32')
      await cell.run()
      const regex = /(?:[A-Za-z0-9+\/]{4}\\n?)*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)/
      expect(await cell.cellOutputExists('', OutputType.ShellOutput, regex)).toBe(true)
    })

    it('Curl an image', async () => {
      // eslint-disable-next-line max-len
      const cell = await notebook.getCell('curl https://lever-client-logos.s3.us-west-2.amazonaws.com/a8ff9b1f-f313-4632-b90f-1f7ae7ee807f-1638388150933.png 2>/dev/null')
      await cell.run()
      await browser.keys(Key.ArrowDown)
      await browser.keys(Key.ArrowDown)
      await browser.keys(Key.ArrowDown)
      await browser.keys(Key.ArrowDown)
      await browser.keys(Key.ArrowDown)
      await browser.keys(Key.ArrowDown)
      const imageRegex = new RegExp('<img src="blob:vscode-webview:\/\/(.)+">')
      await browser.waitUntil(async() => {
        return cell.cellOutputExists('', OutputType.Display, imageRegex)
      }, {
        timeout: 30000
      })
      expect(await cell.isSuccessfulExecution()).toBe(true)
    })

    it('terminal dimensions', async () => {
      const workbench = await browser.getWorkbench()
      const cell = await notebook.getCell('echo Rows: $(tput lines)\necho Columns: $(tput cols)')
      await cell.run()
      await browser.pause(1000)
      await workbench.executeCommand('Terminal select all')
      await workbench.executeCommand('Copy')
      const text = await clipboard.read()
      await clipboard.write('')
      const regex = /Rows:\s+(\d+)\s+Columns:\s+(\d+)/
      expect(regex.test(text)).toBe(true)
    })
  })
})
