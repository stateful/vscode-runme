import { TextDocument, NotebookCellExecution } from 'vscode'

import { RunProgramExecution, RunProgramOptions } from '../../runner'
import { IRunnerEnvironment } from '../../runner/environment'
import { getAnnotations, getCellRunmeId, getWorkspaceEnvs } from '../../utils'
import { getCellCwd, getCellProgram } from '../utils'

export async function createRunProgramOptions(
  execKey: string,
  runningCell: TextDocument,
  exec: NotebookCellExecution,
  execution: RunProgramExecution,
  runnerEnv?: IRunnerEnvironment,
): Promise<RunProgramOptions> {
  const RUNME_ID = getCellRunmeId(exec.cell)
  const envs: Record<string, string> = {
    RUNME_ID,
    ...(await getWorkspaceEnvs(runningCell.uri)),
  }

  const { interactive, mimeType, background } = getAnnotations(exec.cell)
  const { programName, commandMode } = getCellProgram(exec.cell, exec.cell.notebook, execKey)
  const cwd = await getCellCwd(exec.cell, exec.cell.notebook, runningCell.uri)

  return {
    background,
    commandMode,
    convertEol: !mimeType || mimeType === 'text/plain',
    cwd,
    runnerEnv,
    envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
    exec: execution,
    languageId: exec.cell.document.languageId,
    programName,
    storeLastOutput: true,
    tty: interactive,
  }
}
