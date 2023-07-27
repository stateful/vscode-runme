import { getTerminalText } from '../helpers/index.js'

describe('Runme Codelense Support', async () => {
  it('should allow to run a cell', async () => {
    await browser.waitUntil(() => $$('.codelens-decoration').then((elems) => elems.length > 1))
    await $('.codelens-decoration a').click()
    await browser.pause(1000)

    const workbench = await browser.getWorkbench()
    const text = await getTerminalText(workbench)
    expect(text).toContain('Hello World')
  })

  it('should allow to open file in notebook', async () => {
    await browser.waitUntil(() => $$('.codelens-decoration').then((elems) => elems.length > 1))
    await $$('.codelens-decoration a')[1].click()
    await browser.pause(1000)

    const workbench = await browser.getWorkbench()
    await browser.waitUntil(
      async () => (await workbench.getAllWebviews()).length > 0,
      { timeoutMsg: 'Notebook document didn\'t load' }
    )
    const webview = (await workbench.getAllWebviews())[0]
    await webview.open()
    await expect($('body')).toHaveTextContaining('Runme Examples')
    await webview.close()
  })
})
