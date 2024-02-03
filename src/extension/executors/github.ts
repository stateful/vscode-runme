import { window } from 'vscode'

import { OutputType } from '../../constants'

import { parseGitHubURL, getYamlFileContents, getService } from './github/workflows'

import { IKernelExecutor } from '.'

export async function github(executor: IKernelExecutor): Promise<boolean> {
  const { doc, exec, outputs } = executor
  try {
    await getService(true)
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
        cellId: exec.cell.metadata['runme.dev/id'],
      },
    })
    await outputs.showOutput(OutputType.github)
    return true
  } catch (error: any) {
    window.showErrorMessage(`Failed to get GitHub workflow file, reason: ${error.message}`)
    return false
  }
}
