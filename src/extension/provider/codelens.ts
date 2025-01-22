import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  Disposable,
  Event,
  EventEmitter,
  NotebookCellKind,
  TextDocument,
  Range,
  languages,
  commands,
  workspace,
  window,
  tasks,
  EndOfLine,
  Position,
  NotebookData,
  NotebookCellData,
  Uri,
} from 'vscode'

import { isDocumentSessionOutputs, SerializerBase } from '../serializer'
import { type runCLICommand } from '../commands'
import { IRunner } from '../runner'
import { Kernel } from '../kernel'
import { getAnnotations } from '../utils'
import { Serializer } from '../../types'
import { getCodeLensEnabled, getCodeLensPasteIntoTerminalNewline } from '../../utils/configuration'
import { RunmeExtension } from '../extension'
import type { SurveyWinCodeLensRun } from '../survey'
import IServer from '../server/kernelServer'

import { RunmeTaskProvider } from './runmeTask'

export const ActionCommand = 'runme.codelens.action' as const

const ActionTypes = ['run', 'open', 'paste'] as const satisfies readonly string[]

type ActionType = (typeof ActionTypes)[number]

type ActionArguments = [
  document: TextDocument,
  token: CancellationToken,
  notebook: NotebookData,
  cell: NotebookCellData,
  index: number,
  action: ActionType,
]

type ActionCallback = (...arg: ActionArguments) => void

export class RunmeCodeLensProvider implements CodeLensProvider, Disposable {
  private disposables: Disposable[] = []

  private _onDidChangeCodeLenses: EventEmitter<void> = this.register(new EventEmitter<void>())
  public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event

  constructor(
    protected extensionBaseUri: Uri,
    protected serializer: SerializerBase,
    protected runCLI: ReturnType<typeof runCLICommand>,
    protected surveyWinCodeLensRun: SurveyWinCodeLensRun,
    protected runner?: IRunner,
    protected kernel?: Kernel,
    protected server?: IServer,
  ) {
    this.register(
      languages.registerCodeLensProvider(
        [
          { language: 'markdown', scheme: 'file' },
          { language: 'mdx', scheme: 'file' },
        ],
        this,
      ),
    )

    const cmd: ActionCallback = this.codeLensActionCallback.bind(this)

    this.register(RunmeExtension.registerCommand('runme.codelens.action', cmd))

    this.register(workspace.onDidChangeConfiguration(() => this._onDidChangeCodeLenses.fire()))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
    if (!this.runner || !getCodeLensEnabled()) {
      return []
    }

    const contentString = document.getText()
    const contentBytes = Buffer.from(contentString, 'utf-8')

    const eol = {
      [EndOfLine.CRLF]: '\r\n',
      [EndOfLine.LF]: '\n',
    }[document.eol]

    const notebook = await this.serializer.deserializeNotebook(contentBytes, token)

    const isSessionOutputs = isDocumentSessionOutputs(notebook.metadata)
    if (isSessionOutputs) {
      return []
    }

    const { cells } = notebook

    return cells.flatMap((cell, i) => {
      const textRange = (cell.metadata as Serializer.Metadata)['runme.dev/textRange']
      if (cell.kind !== NotebookCellKind.Code || !textRange) {
        return []
      }

      const { start } = textRange

      const lines = contentBytes.subarray(0, start).toString('utf-8').split(eol)

      const line = lines.length - 2
      const offset = 0

      const pos = new Position(line, offset)

      const range = new Range(pos, pos)

      return ActionTypes.map((v) => {
        const args: ActionArguments = [document, token, notebook, cell, i, v]

        /* c8 ignore start */
        switch (v) {
          case 'run':
            {
              return new CodeLens(range, {
                title: '$(play) Run Block',
                command: ActionCommand,
                arguments: args,
              })
            }
            break

          case 'open':
            {
              return new CodeLens(range, {
                title: '$(notebook) Open in Notebook',
                command: ActionCommand,
                arguments: args,
              })
            }
            break

          case 'paste':
            {
              return new CodeLens(range, {
                title: '$(clippy) Paste into Terminal',
                command: ActionCommand,
                arguments: args,
              })
            }
            break
        }
        /* c8 ignore stop */
      })
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveCodeLens(codeLens: CodeLens, token: CancellationToken): Promise<CodeLens> {
    return codeLens
  }

  protected register<T extends Disposable>(d: T) {
    this.disposables.push(d)
    return d
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  protected async codeLensActionCallback(
    document: TextDocument,
    token: CancellationToken,
    notebook: NotebookData,
    cell: NotebookCellData,
    index: number,
    action: ActionType,
  ) {
    switch (action) {
      case 'open':
        {
          await commands.executeCommand('vscode.openWith', document.uri, Kernel.type)

          // TODO(mxs): surely there's a better way to do this
          // probably we need to bring this logic to `workspace.onDidOpenNotebookDocument`
          await new Promise((cb) => setTimeout(cb, 200))

          await commands.executeCommand('notebook.focusTop')

          await Promise.all(
            Array.from({ length: index }, () =>
              commands.executeCommand('notebook.focusNextEditor'),
            ),
          )

          // to execute the command:
          // await commands.executeCommand('notebook.cell.execute')
          // await commands.executeCommand('notebook.cell.focusInOutput')
        }
        break

      case 'run':
        {
          if (this.surveyWinCodeLensRun.shouldPrompt()) {
            await this.surveyWinCodeLensRun.prompt()
            break
          }

          const task = await RunmeTaskProvider.newRunmeTask({
            filePath: document.uri.fsPath,
            command: getAnnotations(cell.metadata).name,
            notebook,
            cell,
            options: {},
            runner: this.runner!,
            runnerEnv: this.kernel?.getRunnerEnvironment(),
          })

          await tasks.executeTask(task)
        }
        break

      case 'paste':
        {
          const value = cell.value
          let activeTerminal = window.activeTerminal

          if (!activeTerminal) {
            activeTerminal = window.createTerminal()
          }

          activeTerminal.show(false)
          activeTerminal.sendText(value, getCodeLensPasteIntoTerminalNewline())
        }
        break
    }
  }
}
