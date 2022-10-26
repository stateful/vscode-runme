import path from 'node:path'

import { NotebookCellOutput, NotebookCellExecution, NotebookCellOutputItem, workspace } from 'vscode'

import { DEFAULT_CWD_OPTION, CWD_SETTING_OPTIONS } from '../constants'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

export function renderError (exec: NotebookCellExecution, output: string) {
  return exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(
      <CellOutput<OutputType.error>>{
        type: OutputType.error,
        output
      },
      OutputType.error
    )
  ]))
}

/**
 * Get working directory for shell or task executions
 * @param exec NotebookCellExecution
 * @returns the working directory to be used for shell executions based on the configuration
 */
export function getShellWorkingDirectory (exec: NotebookCellExecution) {
  const config = workspace.getConfiguration('runme.shell')
  const configSetting = config.get<CWD_SETTING_OPTIONS>('workingDirectory', DEFAULT_CWD_OPTION)

  const wsd = workspace.workspaceFolders?.map((ws) => ws.uri.fsPath).shift()
  if (configSetting === CWD_SETTING_OPTIONS.RelativeToWorkspaceDir && wsd) {
    return wsd
  }

  return path.dirname(exec.cell.document.uri.fsPath)
}
