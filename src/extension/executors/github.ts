import { window } from 'vscode'

import { OutputType } from '../../constants'

import { parseGitHubURL, getYamlFileContents } from './github/workflows'
import GitHubServiceFactory from './github/githubServiceFactory'

import { IKernelExecutor } from '.'

export const github: IKernelExecutor = async (executor) => {
  const { doc, exec, outputs } = executor
  try {
    await new GitHubServiceFactory(['repo']).createService(true)
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
