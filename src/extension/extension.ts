import vscode from "vscode"
import { Serializer } from './notebook'
import { Kernel } from "./kernel"
import { ThumbsDownProvider, ThumbsUpProvider } from './provider/rating'

export function activate(context: vscode.ExtensionContext) {
  const kernel = new Kernel()

  context.subscriptions.push(
    kernel,
    vscode.workspace.registerNotebookSerializer("runme", new Serializer(context), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      "runme",
      new ThumbsUpProvider()
    ),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      "runme",
      new ThumbsDownProvider()
    ),
    vscode.commands.registerCommand('runme.enter', () => {
      if (!kernel.runningCellCommand) {
        return vscode.window.showInformationMessage('No cell is waiting for input')
      }

      vscode.window.showInputBox({
        title: 'Cell Input',
        prompt: `Enter input for cell with command "${kernel.runningCellCommand}"`
      }).then((input) => kernel.emitInput(input || '\n'))
    })
  )
}

// This method is called when your extension is deactivated
export function deactivate() { }
