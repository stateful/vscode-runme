import vscode from "vscode"
import { Serializer } from './notebook'
import { Kernel } from "./kernel"
import { ThumbsDownProvider, ThumbsUpProvider } from './provider/rating'
import { ViteServer } from "./server"

export async function activate(context: vscode.ExtensionContext) {
  const server = await ViteServer.create(context)
  const kernel = new Kernel(context)

  context.subscriptions.push(
    kernel,
    server,
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
}

// This method is called when your extension is deactivated
export function deactivate() { }
