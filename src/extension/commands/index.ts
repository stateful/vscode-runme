import path from 'node:path'
import os from 'node:os'

import {
  NotebookCell, Uri, window, env, NotebookDocument, TextDocument, ViewColumn,
  workspace, NotebookData, commands, NotebookCellData, NotebookCellKind, ExtensionContext, NotebookCellExecution
} from 'vscode'
import { v4 as uuidv4 } from 'uuid'

import { getBinaryPath, getTLSDir, getTLSEnabled, isNotebookTerminalEnabledForCell } from '../../utils/configuration'
import { Kernel } from '../kernel'
import { getAnnotations, getTerminalByCell, replaceOutput } from '../utils'
import RunmeServer from '../server/runmeServer'
import { GrpcRunnerEnvironment } from '../runner'

function showWarningMessage () {
  return window.showWarningMessage('Couldn\'t find terminal! Was it already closed?')
}

export function openTerminal (kernel: Kernel, grpcRunner: boolean, existingExecution?: NotebookCellExecution) {
  return async function (cell: NotebookCell) {
    const terminal = getTerminalByCell(cell)
    if (!terminal) {
      return showWarningMessage()
    }

    if (isNotebookTerminalEnabledForCell(cell) && grpcRunner) {
      const terminalOutput = kernel.getCellTerminalOutputPayload(cell)

      if (terminalOutput) {
        const runOnExec = async (exec: NotebookCellExecution) => {
          await replaceOutput(exec, terminalOutput)
        }

        if (!existingExecution) {
          let exec: NotebookCellExecution|undefined
          try {
            exec = await kernel.createCellExecution(cell)
            exec.start(Date.now())

            await runOnExec(exec)
          } catch (e: any) {
            window.showErrorMessage(e.message)
          } finally {
            exec?.end(true)
            return
          }
        } else {
          await runOnExec(existingExecution)
        }

        return
      }
    }

    return terminal.show()
  }
}

export function copyCellToClipboard (cell: NotebookCell) {
  env.clipboard.writeText(cell.document.getText())
  return window.showInformationMessage('Copied cell to clipboard!')
}

export function stopBackgroundTask (cell: NotebookCell) {
  const terminal = getTerminalByCell(cell)
  if (!terminal) {
    return showWarningMessage()
  }
  terminal.dispose()
  return window.showInformationMessage(`${terminal?.name} task terminated!`)
}

export function runCLICommand(
  extensionBaseUri: Uri,
  grpcRunner: boolean,
  server: RunmeServer,
  kernel: Kernel
) {
 return async function(cell: NotebookCell) {
    const cwd = path.dirname(cell.document.uri.fsPath)

    const args = [
      `--chdir="${cwd}"`,
      `--filename="${path.basename(cell.document.uri.fsPath)}"`
    ]

    const envs: Record<string, string> = { }

    const runmeExecutable = getBinaryPath(extensionBaseUri, os.platform()).fsPath

    if (grpcRunner) {
      envs['RUNME_SERVER_ADDR'] = server.address()

      if (getTLSEnabled()) {
        envs['RUNME_TLS_DIR'] = getTLSDir()
      } else {
        args.push('--insecure')
      }

      const runnerEnv = kernel.getRunnerEnvironment()
      if(runnerEnv && runnerEnv instanceof GrpcRunnerEnvironment) {
        envs['RUNME_SESSION'] = runnerEnv.getSessionId()
      }
    }

    const annotations = getAnnotations(cell)
    const term = window.createTerminal({
      name: `CLI: ${annotations.name}`,
      cwd,
      env: envs,
    })

    term.show(false)
    term.sendText(`${runmeExecutable} run ${annotations.name} ${args.join(' ')}`)
  }
}

export function openAsRunmeNotebook (doc: NotebookDocument) {
  window.showNotebookDocument(doc, {
    viewColumn: ViewColumn.Active
  })
}

export function openSplitViewAsMarkdownText (doc: TextDocument) {
  window.showTextDocument(doc, {
    viewColumn: ViewColumn.Beside
  })
}

export async function createNewRunmeNotebook () {
  const newNotebook = await workspace.openNotebookDocument(
    Kernel.type,
    new NotebookData([
      new NotebookCellData(
        NotebookCellKind.Markup,
        '# Runme Notebook\n\nDouble-click and start writing here...',
        'markdown'
      ),
      new NotebookCellData(NotebookCellKind.Code, 'echo "Hello World"', 'sh'),
      new NotebookCellData(
        NotebookCellKind.Markup,
        '*Read the docs on [runme.dev](https://www.runme.dev/docs/intro)' +
          ' to learn how to get most out of Runme notebooks!*',
        'markdown'
      ),
    ])
  )
  await commands.executeCommand('vscode.openWith', newNotebook.uri, Kernel.type)
}

export async function welcome () {
  commands.executeCommand(
    'workbench.action.openWalkthrough',
    'stateful.runme#runme.welcome',
    false
  )
}

export async function tryIt (context: ExtensionContext) {
  try {
    const fileContent = await workspace.fs.readFile(
      Uri.file(path.join(__dirname, '..', 'walkthroughs', 'welcome.md'))
    )

    const projectUri = Uri.joinPath(context.globalStorageUri, uuidv4())
    await workspace.fs.createDirectory(projectUri)
    const enc = new TextEncoder()
    const newNotebookUri = Uri.joinPath(projectUri, 'Welcome to Runme.md')
    await workspace.fs.writeFile(newNotebookUri, enc.encode(fileContent.toString()))
    await commands.executeCommand('vscode.openWith', newNotebookUri, Kernel.type)
  } catch (err) {
    const localMarkdown = Uri.joinPath(Uri.file(context.extensionPath), 'walkthroughs', 'welcome.md')
    return commands.executeCommand('vscode.openWith', localMarkdown, Kernel.type)
  }
}
