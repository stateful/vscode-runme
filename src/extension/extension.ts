import * as vscode from "vscode"
import {
  Kernel,
  Serializer,
  ThumbsDownProvider,
  ThumbsUpProvider,
} from "./providers"

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
