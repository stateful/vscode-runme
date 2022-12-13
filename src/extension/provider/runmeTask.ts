import path from 'node:path'
import { EventEmitter } from 'node:events'

import {
  ExtensionContext, ProviderResult, Task, TaskProvider, Uri,
  workspace, window, TaskScope, TaskRevealKind, TaskPanelKind
} from 'vscode'

import { initWasm } from '../utils'
import { WasmLib, RunmeTaskDefinition } from '../../types'

declare var globalThis: any
type TaskOptions = Pick<RunmeTaskDefinition, 'closeTerminalOnSuccess' | 'isBackground' | 'cwd' | 'stdoutEvent'>

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
    const { Runme } = globalThis as WasmLib.Runme
    Runme.initialize(mdContent)

    const cells = Runme.getCells().cells as WasmLib.Cell[]
    return cells
      .filter((cell: WasmLib.Cell): cell is WasmLib.CodeCell => cell.type === WasmLib.CellType.Code)
      .map((cell) => RunmeTaskProvider.getRunmeTask(current.fsPath, cell.name))
  }

  public resolveTask(task: Task): ProviderResult<Task> {
    return task
  }

  static getRunmeTask (filePath: string, command: string, options: TaskOptions = {}): RunmeTask {
    const cwd = options.cwd || path.dirname(filePath)
    const closeTerminalOnSuccess = options.closeTerminalOnSuccess || true
    const isBackground = options.isBackground || false
    const stdoutEvent = options.stdoutEvent || new EventEmitter()

    const definition: RunmeTaskDefinition = {
      type: 'runme',
      filePath,
      command,
      closeTerminalOnSuccess,
      isBackground,
      cwd,
      stdoutEvent
    }

    const task = new Task(
      definition,
      TaskScope.Workspace,
      command,
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
