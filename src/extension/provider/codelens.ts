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
  tasks
} from 'vscode'

import { SerializerBase } from '../serializer'
import type { runCLICommand } from '../commands'
import { IRunner } from '../runner'
import { Kernel } from '../kernel'
import { getAnnotations } from '../utils'
import { Serializer } from '../../types'
import { getCodeLensEnabled } from '../../utils/configuration'
import { RunmeExtension } from '../extension'

import { RunmeTaskProvider } from './runmeTask'

export const ActionCommand = 'runme.codelens.action' as const

const ActionTypes = [
  'run',
  'open',
] as const satisfies readonly string[]

type ActionType = (typeof ActionTypes)[number]

type ActionArguments = [
  document: TextDocument,
  token: CancellationToken,
  cell: Serializer.Cell,
  index: number,
  action: ActionType
]

type ActionCallback = (...arg: ActionArguments) => void

export class RunmeCodeLensProvider implements CodeLensProvider, Disposable {
  private disposables: Disposable[] = []

  private _onDidChangeCodeLenses: EventEmitter<void> = this.register(new EventEmitter<void>())
	public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event

  constructor(
    protected serializer: SerializerBase,
    protected runCLI: ReturnType<typeof runCLICommand>,
    protected runner?: IRunner,
    protected kernel?: Kernel
  ) {
    this.register(
      languages.registerCodeLensProvider(
        [
          { language: 'markdown', scheme: 'file' },
          { language: 'mdx', scheme: 'file' },
        ]
      , this)
    )

    const cmd: ActionCallback = this.codeLensActionCallback.bind(this)

    this.register(
      RunmeExtension.registerCommand('runme.codelens.action', cmd)
    )

    this.register(
      workspace.onDidChangeConfiguration(() =>
        this._onDidChangeCodeLenses.fire()
      )
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
    if (!this.runner || !getCodeLensEnabled()) {
      return []
    }

    const contentBytes = Buffer.from(document.getText())
    const { cells } = await this.serializer['reviveNotebook'](contentBytes, token)

    return cells.flatMap((cell, i) => {
      if (cell.kind !== NotebookCellKind.Code || !cell.textRange) { return [] }

      let start = document.positionAt(cell.textRange.start)
      let end = document.positionAt(cell.textRange.end)

      start = start.with(start.line - 1)
      end = end.with(end.line - 1)

      const range = new Range(
        start, end
      )

      return ActionTypes.map((v) => {
        const args: ActionArguments = [document, token, cell, i, v]

        /* c8 ignore start */
        switch (v) {
          case 'run': {
            return new CodeLens(range, {
                title: '$(play) Run Block',
                command: ActionCommand,
                arguments: args,
              })
          } break

          case 'open': {
            return new CodeLens(range, {
                title: '$(notebook) Open in Notebook',
                command: ActionCommand,
                arguments: args,
              })
          } break
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
    cell: Serializer.Cell,
    index: number,
    action: ActionType
  ) {
    switch (action) {
      case 'open': {
        await commands.executeCommand('vscode.openWith', document.uri, Kernel.type)

        // TODO(mxs): surely there's a better way to do this
        // probably we need to bring this logic to `workspace.onDidOpenNotebookDocument`
        await new Promise(cb => setTimeout(cb, 200))

        await commands.executeCommand('notebook.focusTop')

        await Promise.all(
          Array.from(
            {length: index}, () => commands.executeCommand('notebook.focusNextEditor')
          )
        )

        // to execute the command:
        // await commands.executeCommand('notebook.cell.execute')
        // await commands.executeCommand('notebook.cell.focusInOutput')
      } break

      case 'run': {
        const task = await RunmeTaskProvider.getRunmeTask(
          document.uri.fsPath,
          getAnnotations(cell.metadata).name,
          cell,
          {},
          this.runner!,
          this.kernel?.getRunnerEnvironment()
        )

        await tasks.executeTask(task)
      } break
    }
  }
}
