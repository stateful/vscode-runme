import { NotebookCellExecution, TextDocument, authentication, window } from 'vscode'

import type { Kernel } from '../kernel'
import { NotebookCellOutputManager } from '../cell'
import { AuthenticationProviders, OutputType } from '../../constants'

import { parseGitHubURL, getYamlFileContents } from './github/workflows'

export async function github(
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument,
  outputs: NotebookCellOutputManager,
): Promise<boolean> {
  try {
    await authentication.getSession(AuthenticationProviders.GitHub, ['repo'], { createIfNone: true })
    const { owner, repo, path, ref } = parseGitHubURL(doc.getText())
    const json = await getYamlFileContents({ owner, repo, path })
    outputs.setState({
      type: OutputType.github,
      state: {
        content: json,
        repo,
        owner,
        workflow_id: path,
        ref,
        cellId: exec.cell.metadata['runme.dev/uuid']
      }
    })
    await outputs.showOutput(OutputType.github)
    return true
  } catch (error: any) {
    window.showErrorMessage(`Failed to get GitHub workflow file, reason: ${error.message}`)
    return false
  }
}