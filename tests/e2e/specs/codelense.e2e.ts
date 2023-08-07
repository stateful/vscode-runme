import { getTerminalText, killAllTerminals } from '../helpers/index.js'

describe('Runme Codelense Support', async () => {
  it('should allow to run a cell', async () => {
    await browser.waitUntil(() => $$('.codelens-decoration').then((elems) => elems.length > 1))
    await $('.codelens-decoration a').click()
    await browser.pause(1000)

    const workbench = await browser.getWorkbench()
    const text = await getTerminalText(workbench)
    expect(text).toContain('Hello World!\n ')
    await killAllTerminals(workbench)
  })

  it('should allow to paste into terminal', async () => {
    await browser.waitUntil(
      () => $$('.codelens-decoration').then((elems) => {
        return elems.length > 1
      }),
      { timeoutMsg: 'Codelens not found', timeout: 30 * 1000 })
    const lense = (await $$('.codelens-decoration a'))[2]
    await lense.click()
    await browser.pause(1000)

    const workbench = await browser.getWorkbench()
    const text = await getTerminalText(workbench)
    expect(text).toContain('echo "Hello World!"')
    await killAllTerminals(workbench)
  })

  it('should allow to open file in notebook', async () => {
    await browser.waitUntil(
      () => $$('.codelens-decoration').then((elems) => elems.length > 1),
      { timeoutMsg: 'Codelens not found', timeout: 30 * 1000 })
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
