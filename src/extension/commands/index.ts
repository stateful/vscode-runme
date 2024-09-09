import path from 'node:path'

import {
  NotebookCell,
  Uri,
  window,
  env,
  NotebookDocument,
  TextDocument,
  ViewColumn,
  workspace,
  NotebookData,
  commands,
  NotebookCellData,
  NotebookCellKind,
  ExtensionContext,
  authentication,
  ProgressLocation,
} from 'vscode'
import { v4 as uuidv4 } from 'uuid'
import { TelemetryReporter } from 'vscode-telemetry'

import {
  OpenViewInEditorAction,
  getActionsOpenViewInEditor,
  getBinaryPath,
  getCLIUseIntegratedRunme,
  getTLSEnabled,
  isNotebookTerminalEnabledForCell,
  isRunmeAppButtonsEnabled,
} from '../../utils/configuration'
import { Kernel } from '../kernel'
import {
  getAnnotations,
  getNotebookCategories,
  getPlatformAuthSession,
  getTerminalByCell,
  openFileAsRunmeNotebook,
  promptUserSession,
} from '../utils'
import { NotebookToolbarCommand, NotebookUiEvent } from '../../types'
import getLogger from '../logger'
import { RecommendExtensionMessage } from '../messaging'
import {
  NOTEBOOK_AUTOSAVE_ON,
  NOTEBOOK_OUTPUTS_MASKED,
  NOTEBOOK_RUN_WITH_PROMPTS,
  NOTEBOOK_AUTHOR_MODE_ON,
  ClientMessages,
  TELEMETRY_EVENTS,
} from '../../constants'
import ContextState from '../contextState'
import { createGist } from '../services/github/gist'
import { InitializeClient } from '../api/client'
import { GetUserEnvironmentsDocument } from '../__generated-platform__/graphql'
import { EnvironmentManager } from '../environment/manager'

const log = getLogger('Commands')

function showWarningMessage() {
  return window.showWarningMessage("Couldn't find terminal! Was it already closed?")
}

export function openIntegratedTerminal(cell: NotebookCell) {
  const terminal = getTerminalByCell(cell)
  if (!terminal) {
    return showWarningMessage()
  }

  return terminal.show()
}

export async function openRunmeSettings(id?: string) {
  let query = '@ext:stateful.runme'
  if (id) {
    query = `${query} ${id}`
  }
  return commands.executeCommand('workbench.action.openSettings', query)
}

export async function displayCategoriesSelector({
  context,
  notebookToolbarCommand,
  kernel,
}: NotebookToolbarCommand) {
  const categories = await getNotebookCategories(
    context,
    notebookToolbarCommand.notebookEditor.notebookUri,
  )
  if (!categories) {
    return
  }
  const category = await window.showQuickPick(categories.sort(), {
    title: 'Select a category to run.',
    ignoreFocusOut: true,
    placeHolder: 'Select a category',
  })
  if (!category) {
    return
  }
  kernel.setCategory(category)

  await commands.executeCommand('notebook.execute')
}

export async function runCellsByCategory(cell: NotebookCell, kernel: Kernel) {
  const annotations = getAnnotations(cell)
  const category = annotations.category
  if (!category) {
    const answer = await window.showInformationMessage(
      'No category assigned to this cell. Add one in the configuration.',
      'Configure',
      'Dismiss',
    )
    if (answer !== 'Configure') {
      return
    }
    return await commands.executeCommand('runme.toggleCellAnnotations', cell)
  }
  kernel.setCategory(category)
  await commands.executeCommand('notebook.execute')
}

export function toggleTerminal(kernel: Kernel, notebookTerminal: boolean, forceShow = false) {
  return async function (cell: NotebookCell) {
    if (
      (isNotebookTerminalEnabledForCell(cell) && notebookTerminal) ||
      !getAnnotations(cell).interactive
    ) {
      const outputs = await kernel.getCellOutputs(cell)

      if (!forceShow) {
        await outputs.toggleTerminal()
      } else {
        await outputs.showTerminal()
      }

      return
    }

    const terminal = getTerminalByCell(cell)
    if (!terminal) {
      return showWarningMessage()
    }

    return terminal.show()
  }
}

export function copyCellToClipboard(cell: NotebookCell) {
  env.clipboard.writeText(cell.document.getText())
  return window.showInformationMessage('Copied cell to clipboard!')
}

export function stopBackgroundTask(cell: NotebookCell) {
  const terminal = getTerminalByCell(cell)
  if (!terminal) {
    return showWarningMessage()
  }
  terminal.dispose()
}

async function runStatusCommand(cell: NotebookCell): Promise<boolean> {
  if (cell.notebook.isDirty) {
    const option = await window.showInformationMessage(
      'You have unsaved changes. Save and proceed?',
      'Save',
      'Cancel',
    )

    if (option === 'Cancel' || !option) {
      return false
    }

    await cell.notebook.save()
  }

  return true
}

export function runForkCommand(kernel: Kernel, extensionBaseUri: Uri, _grpcRunner: boolean) {
  return async function (cell: NotebookCell) {
    if (!(await runStatusCommand(cell))) {
      return
    }

    const cwd = path.dirname(cell.document.uri.fsPath)

    const program = await kernel.createTerminalProgram(cwd)

    const annotations = getAnnotations(cell.metadata)
    const term = window.createTerminal({
      name: `Fork: ${annotations.name}`,
      pty: program,
      iconPath: {
        dark: Uri.joinPath(extensionBaseUri, 'assets', 'logo-open-dark.svg'),
        light: Uri.joinPath(extensionBaseUri, 'assets', 'logo-open-light.svg'),
      },
    })

    term.show(false)
  }
}

export function runCLICommand(kernel: Kernel, extensionBaseUri: Uri, grpcRunner: boolean) {
  return async function (cell: NotebookCell) {
    if (!(await runStatusCommand(cell))) {
      return
    }

    const cwd = path.dirname(cell.document.uri.fsPath)

    const index = cell.notebook
      .getCells()
      .filter((x) => x.kind === NotebookCellKind.Code)
      .indexOf(cell)

    if (index < 0) {
      window.showErrorMessage('Internal error identifying cell index')
      log.error(`Failed getting code cell index for cell at index ${cell.index}`)

      return
    }

    const args = [
      `--chdir="${cwd}"`,
      `--filename="${path.basename(cell.document.uri.fsPath)}"`,
      `--index=${index}`,
    ]

    if (grpcRunner) {
      if (!getTLSEnabled()) {
        args.push('--insecure')
      }
    }

    const annotations = getAnnotations(cell.metadata)
    const term = window.createTerminal({
      name: `CLI: ${annotations.name}`,
      cwd,
    })

    const runmeExec = getCLIUseIntegratedRunme() ? getBinaryPath(extensionBaseUri).fsPath : 'runme'

    term.show(false)
    term.sendText(`${runmeExec} run ${args.join(' ')}`)
  }
}

function openDocumentAs(doc: { text?: TextDocument; notebook?: NotebookDocument }) {
  const openIn = getActionsOpenViewInEditor()
  switch (openIn) {
    case OpenViewInEditorAction.enum.toggle:
      {
        commands.executeCommand('workbench.action.toggleEditorType')
      }
      break
    default:
      {
        if (doc.notebook) {
          window.showNotebookDocument(doc.notebook, {
            viewColumn: ViewColumn.Active,
          })
        } else if (doc.text) {
          window.showTextDocument(doc.text, {
            viewColumn: ViewColumn.Beside,
          })
        }
      }
      break
  }
}

export function openAsRunmeNotebook(doc: NotebookDocument) {
  openDocumentAs({ notebook: doc })
}

export function openSplitViewAsMarkdownText(doc: TextDocument) {
  openDocumentAs({ text: doc })
}

export async function askNewRunnerSession(kernel: Kernel) {
  const action = await window.showInformationMessage(
    'Resetting your Runme session will remove all notebook state and environment variables. Are you sure?',
    { modal: true },
    'OK',
  )
  if (action) {
    await commands.executeCommand('workbench.action.files.save')
    await kernel.newRunnerEnvironment({})
    await commands.executeCommand('workbench.action.files.save')
  }
}

export enum ASK_ALT_OUTPUTS_ACTION {
  ORIGINAL = 'Open original document',
  PREVIEW = 'Preview session outputs',
}

export async function askAlternativeOutputsAction(
  basePath: string,
  metadata: { [key: string]: any },
): Promise<void> {
  const action = await window.showWarningMessage(
    'Running Session Outputs from a previous notebook session is not supported.',
    { modal: true },
    ASK_ALT_OUTPUTS_ACTION.ORIGINAL,
  )

  const orig =
    metadata['runme.dev/frontmatterParsed']?.['runme']?.['session']?.['document']?.['relativePath']

  switch (action) {
    case ASK_ALT_OUTPUTS_ACTION.ORIGINAL:
      const origFilePath = Uri.parse(path.join(basePath, orig))
      await commands.executeCommand('vscode.openWith', origFilePath, Kernel.type)
      break
    // case ASK_ALT_OUTPUTS_ACTION.PREVIEW:
    //   await commands.executeCommand('markdown.showPreview', notebookDoc.uri)
    //   break
  }
}

export async function createNewRunmeNotebook() {
  const newNotebook = await workspace.openNotebookDocument(
    Kernel.type,
    new NotebookData([
      new NotebookCellData(
        NotebookCellKind.Markup,
        '# Runme Notebook\n\nDouble-click and start writing here...',
        'markdown',
      ),
      new NotebookCellData(NotebookCellKind.Code, 'echo "Hello World"', 'sh'),
      new NotebookCellData(
        NotebookCellKind.Markup,
        '*Read the docs on [runme.dev](https://runme.dev/docs/intro)' +
          ' to learn how to get most out of Runme notebooks!*',
        'markdown',
      ),
    ]),
  )
  await commands.executeCommand('vscode.openWith', newNotebook.uri, Kernel.type)
}

export async function welcome() {
  commands.executeCommand('workbench.action.openWalkthrough', 'stateful.runme#runme.welcome', false)
}

export async function tryIt(context: ExtensionContext) {
  try {
    const fileContent = await workspace.fs.readFile(
      Uri.file(path.join(__dirname, '..', 'walkthroughs', 'welcome.md')),
    )

    const projectUri = Uri.joinPath(context.globalStorageUri, uuidv4())
    await workspace.fs.createDirectory(projectUri)
    const enc = new TextEncoder()
    const newNotebookUri = Uri.joinPath(projectUri, 'Welcome to Runme.md')
    await workspace.fs.writeFile(newNotebookUri, enc.encode(fileContent.toString()))
    await commands.executeCommand('vscode.openWith', newNotebookUri, Kernel.type)
  } catch (err) {
    const localMarkdown = Uri.joinPath(
      Uri.file(context.extensionPath),
      'walkthroughs',
      'welcome.md',
    )
    return commands.executeCommand('vscode.openWith', localMarkdown, Kernel.type)
  }
}

export async function openFileInRunme(uri: Uri, selection?: Uri[]) {
  await Promise.all((selection ?? [uri]).map(openFileAsRunmeNotebook))
}

export async function authenticateWithGitHub() {
  try {
    await authentication.getSession('github', ['repo'], { createIfNone: true })
  } catch (error) {
    window.showErrorMessage('Failed to authenticate with GitHub')
  }
}

export async function addToRecommendedExtensions(context: ExtensionContext) {
  return new RecommendExtensionMessage(context, {
    'runme.recommendExtension': true,
  }).display()
}

export async function toggleAutosave(autoSaveIsOn: boolean) {
  if (autoSaveIsOn && isRunmeAppButtonsEnabled()) {
    await promptUserSession()
  }
  return ContextState.addKey(NOTEBOOK_AUTOSAVE_ON, autoSaveIsOn)
}

export async function toggleMasking(maskingIsOn: boolean): Promise<void> {
  ContextState.addKey(NOTEBOOK_OUTPUTS_MASKED, maskingIsOn)
}

export async function runCellWithPrompts(cell: NotebookCell, kernel: Kernel) {
  await ContextState.addKey(NOTEBOOK_RUN_WITH_PROMPTS, true)
  await kernel.executeAndFocusNotebookCell(cell)
  await ContextState.addKey(NOTEBOOK_RUN_WITH_PROMPTS, false)
}

export async function createGistCommand(e: NotebookUiEvent, context: ExtensionContext) {
  let gitShared = true
  try {
    if (!e.ui) {
      return
    }

    const uri = e.notebookEditor.notebookUri
    const fileName = path.basename(uri.path)
    const bytes = await workspace.fs.readFile(uri)
    const templatePath = Uri.joinPath(context.extensionUri, 'templates', 'gist.md')
    const byRunmeFile = await workspace.fs.readFile(templatePath)
    const [originalFileName, sessionId] = fileName.split('-')

    const createGistProgress = await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Creating new Gist ...',
        cancellable: true,
      },
      async () => {
        const createdGist = await createGist({
          isPublic: false,
          files: {
            [fileName]: {
              content: Buffer.from(bytes).toString('utf8'),
            },
            [`summary-${sessionId}`]: {
              content: Buffer.from(byRunmeFile)
                .toString('utf8')
                .replaceAll('%%file%%', `${originalFileName}.md`)
                .replaceAll('%%session%%', sessionId.replace('.md', '')),
            },
          },
        })

        return createdGist
      },
    )

    const option = await window.showInformationMessage(
      'The Runme Gist has been created!',
      'Open',
      'Cancel',
    )

    if (option === 'Open') {
      env.openExternal(Uri.parse(`${createGistProgress.data?.html_url}`))
    }
  } catch (error) {
    gitShared = false
    window.showErrorMessage(`Failed to generate Runme Gist: ${(error as any).message}`)
  } finally {
    TelemetryReporter.sendTelemetryEvent(TELEMETRY_EVENTS.NotebookGist, {
      error: gitShared.toString(),
    })
  }
}

export async function toggleAuthorMode(isAuthorMode: boolean, kernel: Kernel) {
  kernel.messaging.postMessage({
    type: ClientMessages.onAuthorModeChange,
    output: {
      isAuthorMode,
    },
  })
  return ContextState.addKey(NOTEBOOK_AUTHOR_MODE_ON, isAuthorMode)
}

export async function createCellGistCommand(cell: NotebookCell, context: ExtensionContext) {
  let gitShared = true
  try {
    const uri = cell.notebook.uri
    const fileName = path.basename(uri.path)
    const templatePath = Uri.joinPath(context.extensionUri, 'templates', 'gist.md')
    const byRunmeFile = await workspace.fs.readFile(templatePath)
    const cellGistTemplate = await workspace.fs.readFile(
      Uri.joinPath(context.extensionUri, 'templates', 'cellGist.md'),
    )
    const [originalFileName, sessionId] = fileName.split('-')
    const cellId = cell.notebook.metadata['runme.dev/id']
    const markdownId = cellId ? `${cellId}.md` : sessionId

    const createGistProgress = await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Creating new cell Gist ...',
        cancellable: true,
      },
      async () => {
        const createdGist = await createGist({
          isPublic: false,
          files: {
            [`${markdownId}`]: {
              content: Buffer.from(cellGistTemplate)
                .toString('utf8')
                .replaceAll('%%cell_text%%', cell.document.getText())
                .replaceAll('%%language%%', cell.document.languageId),
            },
            [`summary-${markdownId}`]: {
              content: Buffer.from(byRunmeFile)
                .toString('utf8')
                .replaceAll('%%file%%', `${originalFileName}.md`)
                .replaceAll('%%session%%', sessionId.replace('.md', '')),
            },
          },
        })

        return createdGist
      },
    )

    const option = await window.showInformationMessage(
      'The Runme Gist has been created for the cell!',
      'Open',
      'Cancel',
    )

    if (option === 'Open') {
      env.openExternal(Uri.parse(`${createGistProgress.data?.html_url}`))
    }
  } catch (error) {
    gitShared = false
    window.showErrorMessage(`Failed to generate Runme Gist: ${(error as any).message}`)
  } finally {
    TelemetryReporter.sendTelemetryEvent(TELEMETRY_EVENTS.CellGist, {
      error: gitShared.toString(),
    })
  }
}

export async function selectEnvironment(manager: EnvironmentManager) {
  const session = await getPlatformAuthSession()
  const graphClient = InitializeClient({ runmeToken: session?.accessToken! })

  const result = await graphClient.query({
    query: GetUserEnvironmentsDocument,
  })

  const options = result.data.userEnvironments.map((env) => ({
    id: env.id,
    label: env.name,
    description: env.description || '',
  }))

  options.push({
    id: '',
    label: 'None',
    description: '',
  })

  const selected = await window.showQuickPick(options, {
    placeHolder: 'Select an environment',
    canPickMany: false,
  })
  if (selected) {
    const isEnv = !!selected.id
    manager.setEnvironment(isEnv ? selected : null)
    window.showInformationMessage(
      isEnv ? `Selected environment: ${selected.label}` : 'Environment cleared',
    )
  }
}
