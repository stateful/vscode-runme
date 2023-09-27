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
  NotebookDocument,
  NotebookEditor,
  NotebookCellKind,
} from 'vscode'
import got from 'got'
import { v4 as uuidv4 } from 'uuid'
import { TelemetryReporter } from 'vscode-telemetry'

import getLogger from '../logger'
import { Kernel } from '../kernel'

import {
  getProjectDir,
  getTargetDirName,
  getSuggestedProjectName,
  writeBootstrapFile,
  parseParams,
} from './utils'

const REGEX_WEB_RESOURCE = /^https?:\/\//
const log = getLogger('RunmeUriHandler')

export class RunmeUriHandler implements UriHandler {
  #context: ExtensionContext
  #kernel: Kernel
  constructor(context: ExtensionContext, kernel: Kernel) {
    this.#context = context
    this.#kernel = kernel
  }

  async handleUri(uri: Uri) {
    log.info(`triggered RunmeUriHandler with ${uri}`)
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

    if (command === 'demo') {
      try {
        const { fileToOpen, repository, cell } = parseParams(params)
        if (!repository) {
          throw new Error('Could not find a valid git repository')
        }

        if (!cell || Number.isNaN(cell)) {
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

        window.onDidChangeActiveNotebookEditor((listener: NotebookEditor | undefined) => {
          return this._executeCell(cell, listener?.notebook)
        })
        // Handle cell execution if the file is already opened in the editor
        const activeDocument = window.activeNotebookEditor
        if (activeDocument?.notebook && activeDocument.notebook.uri.path === documentPath.path) {
          await this._executeCell(cell, activeDocument.notebook)
        } else {
          await commands.executeCommand('vscode.openWith', documentPath, Kernel.type)
        }
        return
      } catch (error) {
        window.showErrorMessage((error as Error).message || 'Failed to execute command')
        return
      }
    }

    window.showErrorMessage(`Couldn't recognise command "${command}"`)
  }

  private async _executeCell(cell: number, notebookDocument: NotebookDocument | undefined) {
    if (!notebookDocument || notebookDocument.notebookType !== Kernel.type) {
      return
    }
    if (notebookDocument) {
      const cells = notebookDocument
        .getCells()
        .filter((cell) => cell.kind === NotebookCellKind.Code)

      if (!cells.length || Number.isNaN(cell)) {
        return window.showErrorMessage('Could not find a valid code cell to execute')
      }

      const cellToExecute = cells[cell]
      if (!cellToExecute) {
        throw new Error(`Could not find cell at index ${cell}`)
      }
      return this.#kernel.executeAndFocusNotebookCell(cellToExecute)
    }
  }

  private async _setupProject(fileToOpen: string, repository?: string | null) {
    if (!repository) {
      return window.showErrorMessage('No project to setup was provided in the url')
    }

    const suggestedProjectName = getSuggestedProjectName(repository)
    const projectDirUri = await getProjectDir(this.#context)

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
    window.showInformationMessage('Setting up a new project using Runme...')
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
    const projectDirUri = await getProjectDir(this.#context)
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
      new ShellExecution(`git clone ${repository} "${targetDirUri.fsPath}"`),
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
    const projectDirUri = await getProjectDir(this.#context)

    if (!projectDirUri || !projectName) {
      throw new Error(`Could not get a project path for ${repository}`)
    }

    return Uri.joinPath(projectDirUri, 'demo', projectName)
  }
}
