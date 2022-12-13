import path from 'node:path'

import {
  ExtensionContext, ProviderResult, Task, TaskProvider, Uri,
  workspace, window, TaskScope, TaskRevealKind, TaskPanelKind, NotebookCellKind
} from 'vscode'

import { initWasm } from '../utils'
import { WasmLib, RunmeTaskDefinition } from '../../types'

declare var globalThis: any
type TaskOptions = Pick<RunmeTaskDefinition, 'closeTerminalOnSuccess' | 'isBackground' | 'cwd'>

export interface RunmeTask extends Task {
  definition: Required<RunmeTaskDefinition>
}

export class RunmeTaskProvider implements TaskProvider {
  static id = 'runme'
  constructor (private context: ExtensionContext) {}

  public async provideTasks(): Promise<Task[]> {
    const wasmUri = Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    await initWasm(wasmUri)

    const current = (
      window.activeNotebookEditor?.notebook.uri.fsPath.endsWith('md') && window.activeNotebookEditor?.notebook.uri ||
      workspace.workspaceFolders?.[0].uri && Uri.joinPath(workspace.workspaceFolders?.[0].uri, 'Readme.md')
    )

    if (!current) {
      return []
    }

    const mdContent = (await workspace.fs.readFile(current)).toString()
    const { Runme } = globalThis as WasmLib.New.Serializer
    const notebook = await Runme.deserialize(mdContent)

    return notebook.cells
      .filter((cell: WasmLib.New.Cell): cell is WasmLib.New.Cell => cell.kind === NotebookCellKind.Code)
      .map((cell) => RunmeTaskProvider.getRunmeTask(current.fsPath, cell.metadata?.name))
  }

  public resolveTask(task: Task): ProviderResult<Task> {
    /**
     * ToDo(Christian) fetch terminal from Kernel
     */
    return task
  }

  static getRunmeTask (filePath: string, index: number, options: TaskOptions = {}): RunmeTask {
    const cwd = options.cwd || path.dirname(filePath)
    const closeTerminalOnSuccess = options.closeTerminalOnSuccess || true
    const isBackground = options.isBackground || false

    const definition: RunmeTaskDefinition = {
      type: 'runme',
      filePath,
      index,
      closeTerminalOnSuccess,
      isBackground,
      cwd
    }

    const task = new Task(
      definition,
      TaskScope.Workspace,
      `Runme Command #${index}`,
      RunmeTaskProvider.id
    ) as RunmeTask

    task.isBackground = isBackground
    task.presentationOptions = {
      focus: true,
      // why doesn't this work with Slient?
      reveal: isBackground ? TaskRevealKind.Never : TaskRevealKind.Always,
      panel: isBackground ? TaskPanelKind.Dedicated : TaskPanelKind.Shared
    }

    return task
  }
}
