import path from 'node:path'

import {
  UriHandler,
  window,
  Uri,
  Progress,
  ProgressLocation,
  commands,
  workspace,
  ExtensionContext,
  Task,
  TaskScope,
  ShellExecution,
  tasks,
  EventEmitter,
  Disposable,
} from 'vscode'
import got from 'got'
import { v4 as uuidv4 } from 'uuid'
import { TelemetryReporter } from 'vscode-telemetry'

import getLogger from '../logger'
import { Kernel } from '../kernel'
import { AuthenticationProviders } from '../../constants'

import {
  getProjectDir,
  getTargetDirName,
  getSuggestedProjectName,
  writeBootstrapFile,
  parseParams,
  writeDemoBootstrapFile,
  executeActiveNotebookCell,
  setCurrentCellForBootFile,
} from './utils'

const REGEX_WEB_RESOURCE = /^https?:\/\//
const log = getLogger('RunmeUriHandler')

const extensionNames: { [key: string]: string } = {
  'stateful.platform': 'Stateful',
  'stateful.runme': 'Runme',
}

export class RunmeUriHandler implements UriHandler, Disposable {
  #disposables: Disposable[] = []
  readonly #onAuth = this.register(new EventEmitter<Uri>())
  readonly onAuthEvent = this.#onAuth.event

  constructor(
    private context: ExtensionContext,
    private kernel: Kernel,
    private forceNewWindow: boolean,
  ) {}

  async handleUri(uri: Uri) {
    log.info(`triggered RunmeUriHandler with ${uri}`)
    const params = new URLSearchParams(uri.query)
    const state = params.get('state')
    const code = params.get('code')
    const command = params.get('command')

    if (!command) {
      window.showErrorMessage('No query parameter "command" provided')
      return
    }
    if (command === 'auth' && state && code) {
      TelemetryReporter.sendTelemetryEvent('extension.uriHandler', {
        command,
        type: AuthenticationProviders.Stateful,
      })
      this.#onAuth.fire(uri)
      return
    } else if (command === 'setup') {
      const { fileToOpen, repository } = parseParams(params)
      if (!repository && fileToOpen.match(REGEX_WEB_RESOURCE)) {
        TelemetryReporter.sendTelemetryEvent('extension.uriHandler', { command, type: 'file' })
        await this._setupFile(fileToOpen)
        return
      }

      TelemetryReporter.sendTelemetryEvent('extension.uriHandler', { command, type: 'project' })
      await this._setupProject(fileToOpen, repository)
      return
    } else if (command === 'demo') {
      try {
        const { fileToOpen, repository, cell } = parseParams(params)
        if (!repository) {
          throw new Error('Could not find a valid git repository')
        }

        if (cell < 0 || Number.isNaN(cell)) {
          throw new Error('Missing a cell to execute')
        }

        const projectPath = await this._getProjectPath(fileToOpen, repository)
        const projectExists = await workspace.fs.stat(projectPath).then(
          () => true,
          () => false,
        )
        if (!projectExists) {
          throw new Error(`Project not found ${repository} at ${projectPath.path}`)
        }
        const documentPath = Uri.joinPath(projectPath, fileToOpen)
        // Handle cell execution if the file is already opened in the editor
        const activeDocument = window.activeNotebookEditor
        if (activeDocument?.notebook && activeDocument.notebook.uri.path === documentPath.path) {
          await executeActiveNotebookCell({
            cell,
            kernel: this.kernel,
          })
          return
        } else {
          const isProjectOpened =
            workspace.workspaceFolders?.length &&
            workspace.workspaceFolders.some((w) => w.uri.path === projectPath.path)
          await setCurrentCellForBootFile(this.context, { cell, focus: true, execute: true })
          if (!isProjectOpened) {
            await writeDemoBootstrapFile(projectPath, fileToOpen, cell)
            await commands.executeCommand('vscode.openFolder', projectPath, {
              forceNewWindow: this.forceNewWindow,
            })
          } else {
            await commands.executeCommand('vscode.openWith', documentPath, Kernel.type)
          }
          return
        }
      } catch (error) {
        window.showErrorMessage((error as Error).message || 'Failed to execute command')
        return
      }
    }

    window.showErrorMessage(`Couldn't recognize command "${command}"`)
  }

  private async _setupProject(fileToOpen: string, repository?: string | null) {
    if (!repository) {
      return window.showErrorMessage('No project to setup was provided in the url')
    }

    const suggestedProjectName = getSuggestedProjectName(repository)
    const projectDirUri = await getProjectDir(this.context)

    /**
     * cancel operation if
     * - user doesn't want to create set up project directory
     * - we aren't able to parse the suggested name due to invalid repository param format
     */
    if (!projectDirUri || !suggestedProjectName) {
      return
    }

    const targetDirUri = Uri.joinPath(
      projectDirUri,
      ...(await getTargetDirName(projectDirUri, suggestedProjectName)).split('/'),
    )
    const extensionTitle = extensionNames[this?.context?.extension?.id] || 'Runme'
    window.showInformationMessage(`Setting up a new project using ${extensionTitle}...`)
    return window.withProgress(
      {
        location: ProgressLocation.Window,
        cancellable: false,
        title: `Setting up project from repository ${repository}`,
      },
      (progress) => this._cloneProject(progress, targetDirUri, repository, fileToOpen),
    )
  }

  private async _setupFile(fileToOpen: string) {
    const fileName = path.basename(Uri.parse(fileToOpen).fsPath)
    if (!fileName.endsWith('.md')) {
      return window.showErrorMessage('Parameter "fileToOpen" from URL is not a markdown file!')
    }

    /**
     * cancel operation if user doesn't want to create set up project directory
     */
    const projectDirUri = await getProjectDir(this.context)
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
      await commands.executeCommand('vscode.openFolder', projectUri, {
        forceNewWindow: true,
      })
    } catch (err: unknown) {
      return window.showErrorMessage(
        `Failed to set-up project from ${fileToOpen}: ${(err as Error).message}`,
      )
    }
  }

  private async _cloneProject(
    progress: Progress<{ message?: string; increment?: number }>,
    targetDirUri: Uri,
    repository: string,
    fileToOpen: string,
  ) {
    progress.report({ increment: 0, message: 'Cloning repository...' })

    const taskExecution = new Task(
      { type: 'shell', name: 'Clone Repo' },
      TaskScope.Workspace,
      'Clone Repo',
      'exec',
      new ShellExecution(`git clone --depth=1 ${repository} "${targetDirUri.fsPath}"`),
    )

    const success = await new Promise<boolean>((resolve) => {
      tasks.executeTask(taskExecution).then((execution) => {
        tasks.onDidEndTaskProcess((e) => {
          const taskId = (e.execution as any)['_id']
          const executionId = (execution as any)['_id']

          if (taskId !== executionId || typeof e.exitCode === 'undefined') {
            return resolve(false)
          }

          /**
           * only close terminal if execution passed and desired by user
           */
          return resolve(e.exitCode === 0)
        })
      })
    })

    if (!success) {
      window.showErrorMessage(
        'Failed to checkout repository; see integrated terminal for more details/logs',
      )
      return
    }

    await workspace.fs
      .stat(Uri.joinPath(targetDirUri, fileToOpen))
      .then(() => writeBootstrapFile(targetDirUri, fileToOpen))

    progress.report({ increment: 50, message: 'Opening project...' })
    log.info(`Attempt to open folder ${targetDirUri.fsPath}`)
    await commands.executeCommand('vscode.openFolder', targetDirUri, {
      forceNewWindow: true,
    })
    progress.report({ increment: 100 })
  }

  private async _getProjectPath(fileToOpen: string, repository: string): Promise<Uri> {
    const [, projectName] = getSuggestedProjectName(repository)?.split('/') || []
    const projectDirUri = await getProjectDir(this.context)

    if (!projectDirUri || !projectName) {
      throw new Error(`Could not get a project path for ${repository}`)
    }

    return Uri.joinPath(projectDirUri, 'demo', projectName)
  }

  protected register<T extends Disposable>(disposable: T): T {
    this.#disposables.push(disposable)
    return disposable
  }

  public async dispose() {
    this.#disposables.forEach((d) => d.dispose())
  }
}
