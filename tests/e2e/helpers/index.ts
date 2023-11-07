import clipboard from 'clipboardy'
import type { Workbench } from 'wdio-vscode-service'

/**
 * TODO: cannot get text, this is a bug in wdio integration...
 *
 * Replacement for:
 *
 * ```typescript
 * const text = await terminalView.getText()
 * ```
 */
export async function getTerminalText(workbench: Workbench) {
  const bottomBar = workbench.getBottomBar()
  await bottomBar.openTerminalView()

  await workbench.executeCommand('Terminal select all')
  await workbench.executeCommand('Copy')
  const text = await clipboard.read()
  await clipboard.write('')
  return text
}

export async function killAllTerminals(workbench: Workbench) {
  const bottomBar = workbench.getBottomBar()
  await bottomBar.openTerminalView()
  await workbench.executeCommand('Terminal kill all')
}

export async function tryExecuteCommand(workbench: Workbench, command: string) {
  const cmds = await workbench.openCommandPrompt()

  await cmds.setText(`>${command}`)

  const items = await cmds.getQuickPicks()

  if (items.length > 0 && (await items[0].getLabel()) !== 'No matching commands') {
    await cmds.confirm()
  } else {
    await cmds.cancel()
  }
}

// export async function getInputBox(workbench: Workbench) {
//   if ((await browser.getVSCodeChannel() === 'vscode' && await browser.getVSCodeVersion() >= '1.44.0')
//     || await browser.getVSCodeVersion() === 'insiders') {
//     return new InputBox(workbench.locatorMap)
//   }
//   return new QuickOpenBox(workbench.locatorMap)
// }

// export async function waitForInputBox(workbench: Workbench) {
//   return (await getInputBox(workbench)).wait()
// }

export async function clearAllOutputs(workbench: Workbench) {
  await tryExecuteCommand(workbench, 'Notebook: Clear All Outputs')
  await tryExecuteCommand(workbench, 'Notebook: Clear Cell Outputs')
}
