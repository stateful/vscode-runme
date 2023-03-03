import path from 'node:path'

import { UriHandler, window, Uri, Progress, ProgressLocation, commands, workspace } from 'vscode'
import got from 'got'
import { v4 as uuidv4 } from 'uuid'
import { TelemetryReporter } from 'vscode-telemetry'

import {
    getProjectDir, getTargetDirName, waitForProjectCheckout, getSuggestedProjectName, writeBootstrapFile,
    parseParams, gitSSHUrlToHTTPS
} from './utils'

let NEXT_TERM_ID = 0
const REGEX_WEB_RESOURCE = /^https?:\/\//

export class RunmeUriHandler implements UriHandler {
    async handleUri (uri: Uri) {
        console.log(`[Runme] triggered RunmeUriHandler with ${uri}!!!`)
        const params = new URLSearchParams(uri.query)
        const command = params.get('command')

        if (!command) {
            window.showErrorMessage('No query parameter "command" provided')
            return
        }

        if (command === 'setup') {
            const { fileToOpen, repository } = parseParams(params)
            if (!repository && fileToOpen.match(REGEX_WEB_RESOURCE)) {
                TelemetryReporter.sendTelemetryEvent('extension.uriHandler', { command, type: 'file' })
                await this._setupFile(fileToOpen)
                return
            }

            TelemetryReporter.sendTelemetryEvent('extension.uriHandler', { command, type: 'project' })
            await this._setupProject(fileToOpen, repository)
            return
        }

        window.showErrorMessage(`Couldn't recognise command "${command}"`)
    }

    private async _setupProject (fileToOpen: string, repository?: string | null) {
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
        }, (progress) => this._cloneProject(progress, targetDirUri, repository, fileToOpen))
    }

    private async _setupFile (fileToOpen: string) {
        const fileName = path.basename(Uri.parse(fileToOpen).fsPath)
        if (!fileName.endsWith('.md')) {
            return window.showErrorMessage('Parameter "fileToOpen" from URL is not a markdown file!')
        }

        /**
         * cancel operation if user doesn't want to create set up project directory
         */
        const projectDirUri = await getProjectDir()
        if (!projectDirUri) {
            return
        }

        try {
            const fileContent = (await got.get(fileToOpen)).body
            const projectUri = Uri.joinPath(projectDirUri, uuidv4())
            await workspace.fs.createDirectory(projectUri)

            const enc = new TextEncoder()
            await workspace.fs.writeFile(Uri.joinPath(projectUri, fileName), enc.encode(fileContent))
            await writeBootstrapFile(projectUri, fileName)
            await commands.executeCommand('vscode.openFolder', Uri.parse(projectUri.fsPath), {
                forceNewWindow: true
            })
        } catch (err: unknown) {
            return window.showErrorMessage(`Failed to set-up project from ${fileToOpen}: ${(err as Error).message}`)
        }
    }

    private async _cloneProject (
        progress: Progress<{ message?: string, increment?: number }>,
        targetDirUri: Uri,
        repository: string,
        fileToOpen: string
    ) {
        progress.report({ increment: 0, message: 'Cloning repository...' })
        const terminal = window.createTerminal(`Runme Terminal #${NEXT_TERM_ID++}`)
        terminal.show(true)

        terminal.sendText(`git clone ${gitSSHUrlToHTTPS(repository)} ${targetDirUri.fsPath}`)
        const success = await new Promise<boolean>(
            (resolve) => waitForProjectCheckout(fileToOpen, targetDirUri.fsPath, repository, resolve))

        if (!success) {
            return terminal.dispose()
        }

        progress.report({ increment: 50, message: 'Opening project...' })
        console.log(`[Runme] Attempt to open folder ${targetDirUri.fsPath}`)
        await commands.executeCommand('vscode.openFolder', Uri.parse(targetDirUri.fsPath), {
            forceNewWindow: true
        })
        progress.report({ increment: 100 })
        terminal.dispose()
    }
}
