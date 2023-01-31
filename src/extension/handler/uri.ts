import { UriHandler, window, Uri, Progress, ProgressLocation, commands } from 'vscode'

import { getProjectDir, getTargetDirName, waitForProjectCheckout, getSuggestedProjectName } from './utils'

let NEXT_TERM_ID = 0

export class RunmeUriHandler implements UriHandler {
    async handleUri (uri: Uri) {
        console.log(`[Runme] triggered RunmeUriHandler with ${uri}`)
        const params = new URLSearchParams(uri.query)
        const command = params.get('command')

        if (!command) {
            window.showErrorMessage('No query parameter "command" provided')
            return
        }

        if (command === 'setup') {
            await this._setupProject(params.get('repository'))
            return
        }

        window.showErrorMessage(`Couldn't recognise command "${command}"`)
    }

    private async _setupProject (repository?: string | null) {
        if (!repository) {
            return window.showErrorMessage('No project to setup was provided in the url')
        }

        const suggestedProjectName = getSuggestedProjectName(repository)
        const projectDirUri = await getProjectDir()

        /**
         * cancel operation if
         * - user doesn't want to create set up project directory
         * - we aren't able to parse the suggested name due to invalid repository param format
         */
        if (!projectDirUri || !suggestedProjectName) {
            return
        }

        const targetDirUri = Uri.joinPath(projectDirUri, await getTargetDirName(projectDirUri, suggestedProjectName))
        window.showInformationMessage('Setting up a new project using Runme...')
        return window.withProgress({
            location: ProgressLocation.Window,
            cancellable: false,
            title: `Setting up project from repository ${repository}`
        }, (progress) => this._cloneProject(progress, targetDirUri, repository))
    }

    private async _cloneProject (
        progress: Progress<{ message?: string, increment?: number }>,
        targetDirUri: Uri,
        repository: string
    ) {
        progress.report({ increment: 0, message: 'Cloning repository...' })
        const terminal = window.createTerminal(`Runme Terminal #${NEXT_TERM_ID++}`, '/bin/sh')
        terminal.show(true)

        terminal.sendText(`git clone ${repository} ${targetDirUri.fsPath}`)
        const success = await new Promise<boolean>(
            (resolve) => waitForProjectCheckout(targetDirUri.fsPath, repository, resolve))

        if (!success) {
            return terminal.dispose()
        }

        progress.report({ increment: 50, message: 'Opening project...' })
        await commands.executeCommand('vscode.openFolder', Uri.parse(targetDirUri.fsPath), {
            forceNewWindow: true
        })
        progress.report({ increment: 100 })
        terminal.dispose()
    }
}
