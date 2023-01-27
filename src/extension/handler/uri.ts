import { UriHandler, window, Uri, ProgressLocation, commands, workspace } from 'vscode'
import { dir } from 'tmp-promise'

import { BOOTFILE } from '../constants'

let NEXT_TERM_ID = 0
const INTERVAL = 100
const TIMEOUT = 30 * 1000

export class RunmeUriHandler implements UriHandler {
    async handleUri (uri: Uri) {
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

    private async _setupProject (
        repository: string | null = 'git@github.com:stateful/vscode-issue-explorer.git',
        file = 'README.md'
    ) {
        if (!repository) {
            return window.showErrorMessage('No project to setup was provided in the url')
        }

        if (!repository.startsWith('git@') || !repository.endsWith('.git')) {
            return window.showErrorMessage(
                'Invalid git url, expected following format "git@provider.com/org/project.git",' +
                ` received "${repository}"`
            )
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

            await new Promise<void>((resolve, reject) => {
                const t = setTimeout(() => {
                    clearInterval(i)
                    reject(new Error(`Timed out cloning repository ${repository}`))
                }, TIMEOUT)
                const i = setInterval(async () => {
                    const targetDirUri = Uri.parse(targetDir)
                    const dirEntries = await workspace.fs.readDirectory(targetDirUri)
                    /**
                     * wait until directory has more files than only a ".git"
                     */
                    if (dirEntries.length <= 1) {
                        return
                    }

                    /**
                     * write a runme file into the directory, so the extension knows it has
                     * to open the readme file
                     */
                    const fileExist = await workspace.fs.stat(Uri.joinPath(targetDirUri, file))
                        .then(() => true, () => false)
                    if (fileExist) {
                        const enc = new TextEncoder()
                        await workspace.fs.writeFile(Uri.joinPath(targetDirUri, BOOTFILE), enc.encode(file))
                    }

                    clearTimeout(t)
                    clearInterval(i)
                    resolve()
                }, INTERVAL)

                terminal.sendText(`git clone ${repository} ${targetDir}`)
            })

            progress.report({ increment: 50, message: 'Opening project...' })
            await commands.executeCommand('vscode.openFolder', Uri.parse(targetDir), {
                forceNewWindow: true
            })
            progress.report({ increment: 100 })
            terminal.dispose()
        })
    }
}
