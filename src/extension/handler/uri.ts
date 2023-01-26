import { UriHandler, window, Uri, ProgressLocation, commands } from 'vscode'
import { dir } from 'tmp-promise'

let NEXT_TERM_ID = 0

export class RunmeUriHandler implements UriHandler {
    async handleUri (uri: Uri) {
        const params = new URLSearchParams(uri.query)
        const command = params.get('command') || 'unknown'

        if (command === 'setup') {
            await this._setupProject(params.get('repository'))
            return
        }

        window.showErrorMessage(`Couldn't recognise command "${command}"`)
    }

    private async _setupProject (repository: string | null = 'git@github.com:stateful/vscode-issue-explorer.git') {
        if (!repository) {
            return window.showErrorMessage('No project to setup was provided in the url')
        }

        const targetDir = (await dir()).path
        const terminal = window.createTerminal(`Runme Terminal #${NEXT_TERM_ID++}`, '/bin/sh')
        terminal.show(true)
        window.showInformationMessage('Setting up a new project using Runme...')
        return window.withProgress({
            location: ProgressLocation.Window,
            cancellable: false,
            title: `Setting up project from repository ${repository}`
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Cloning repository...' })
            terminal.sendText(`git clone ${repository} ${targetDir}`)
            await new Promise((resolve) => setTimeout(resolve, 10000))

            progress.report({ increment: 50, message: 'Opening project...' })
            await commands.executeCommand('vscode.openFolder', Uri.parse(targetDir), {
                forceNewWindow: true
            })
            // await new Promise((resolve) => setTimeout(resolve, 2000))
            // terminal.sendText(`code ${targetDir}`)
            // await new Promise((resolve) => setTimeout(resolve, 5000))
            // terminal.sendText(`code ${targetDir} ${targetDir}/README.md`)
            await new Promise((resolve) => setTimeout(resolve, 2000))

            progress.report({ increment: 100 })
            // terminal.dispose()
        })
    }
}
