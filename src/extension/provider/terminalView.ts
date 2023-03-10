import {
    window,
    NotebookCell,
    NotebookCellOutput,
    NotebookCellOutputItem,
    NotebookCellStatusBarItemProvider,
    NotebookCellStatusBarItem,
    NotebookCellStatusBarAlignment,
    NotebookCellKind,
  } from 'vscode'
  
  import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
  import { RunmeExtension } from '../extension'
  import { Kernel } from '../kernel'
  import { replaceOutput } from '../utils'
  
  export class TerminalViewProvider implements NotebookCellStatusBarItemProvider {
  
    constructor(private readonly kernel: Kernel) {
      RunmeExtension.registerCommand(
        'runme.toggleCellTerminalView',
        this.toggleTerminal.bind(this)
      )
    }
  
    public async toggleTerminal(cell: NotebookCell): Promise<void> {
      let exec
      try {
        exec = await this.kernel.createCellExecution(cell)
        exec.start(Date.now())
  
        const json = <CellOutputPayload<OutputType.terminal>>{
            type: OutputType.terminal,
            output: {
              input: 'bencho'
            },
          }
          await replaceOutput(exec, [
            new NotebookCellOutput([
              NotebookCellOutputItem.json(json, OutputType.terminal),
              NotebookCellOutputItem.json(json),
            ]),
          ])
      } catch (e: any) {
        window.showErrorMessage(e.message)
      } finally {
        exec?.end(true)
      }
    }
  
    async provideCellStatusBarItems(
      cell: NotebookCell
    ): Promise<NotebookCellStatusBarItem | undefined> {
      if (cell.kind !== NotebookCellKind.Code) {
        return
      }
  
      const item = new NotebookCellStatusBarItem(
        '$(terminal-view-icon) Terminal',
        NotebookCellStatusBarAlignment.Right
      )
  
      item.command = {
        title: 'Open interactive terminal',
        command: 'runme.toggleCellTerminalView',
        arguments: [cell],
      }
  
      item.tooltip = 'Click to open an interactive terminal'
      return item
    }
  }
  