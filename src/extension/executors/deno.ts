import { ExtensionContext, NotebookCellExecution, TextDocument } from "vscode"

import { bash } from './task'
import { deploy } from "./deno/deploy"

export async function deno (
  context: ExtensionContext,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  return Promise.all([bash(context, exec, doc), deploy(exec)]).then(([a, b]) => a && b)
}
