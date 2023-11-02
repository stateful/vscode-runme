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
} from 'vscode'
import { v4 as uuidv4 } from 'uuid'

import {
  OpenViewInEditorAction,
  getActionsOpenViewInEditor,
  getBinaryPath,
  getCLIUseIntegratedRunme,
  getTLSEnabled,
  isNotebookTerminalEnabledForCell,
} from '../../utils/configuration'
import { Kernel } from '../kernel'
import {
  getAnnotations,
  getNotebookCategories,
  getRunnerSessionEnvs,
  getTerminalByCell,
  openFileAsRunmeNotebook,
} from '../utils'
import RunmeServer from '../server/runmeServer'
import { NotebookToolbarCommand } from '../../types'
import getLogger from '../logger'
import { RecommendExtensionMessage } from '../messaging'
import { NOTEBOOK_AUTOSAVE_ON } from '../../constants'
import ContextState from '../contextState'

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

export function runCLICommand(
  extensionBaseUri: Uri,
  grpcRunner: boolean,
  server: RunmeServer,
  kernel: Kernel,
) {
  return async function (cell: NotebookCell) {
    if (cell.notebook.isDirty) {
      const option = await window.showInformationMessage(
        'You have unsaved changes. Save and run in CLI?',
        'Save',
        'Cancel',
      )

      if (option === 'Cancel' || !option) {
        return
      }

      await cell.notebook.save()
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

    let envs: Record<string, string> = {}

    if (grpcRunner) {
      if (!getTLSEnabled()) {
        args.push('--insecure')
      }

      envs = getRunnerSessionEnvs(extensionBaseUri, kernel, server)
    }

    const annotations = getAnnotations(cell.metadata)
    const term = window.createTerminal({
      name: `CLI: ${annotations.name}`,
      cwd,
      env: envs,
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

export async function toggleAutosave(context: ExtensionContext, autoSaveIsOn: boolean) {
  return ContextState.addKey(NOTEBOOK_AUTOSAVE_ON, autoSaveIsOn)
}
