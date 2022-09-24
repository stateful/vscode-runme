import vscode from "vscode"
import { Serializer } from './notebook'
import { Kernel } from "./kernel"
import { ThumbsDownProvider, ThumbsUpProvider } from './provider/rating'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
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
    )
  )
  context.subscriptions.push(new Kernel())
}

// This method is called when your extension is deactivated
export function deactivate() { }
