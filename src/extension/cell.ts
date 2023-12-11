import {
  commands,
  window,
  Disposable,
  NotebookCell,
  NotebookCellExecution,
  NotebookCellKind,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookController,
  NotebookEdit,
  NotebookEditor,
  workspace,
  WorkspaceEdit,
} from 'vscode'

import { NOTEBOOK_AUTOSAVE_ON, OutputType } from '../constants'
import { CellOutputPayload, DenoState, GitHubState, Serializer, VercelState } from '../types'
import { Mutex } from '../utils/sync'
import { getNotebookTerminalConfigurations, isRunmeAppButtonsEnabled } from '../utils/configuration'

import { RUNME_TRANSIENT_REVISION } from './constants'
import { getAnnotations, replaceOutput, validateAnnotations } from './utils'
import {
  ITerminalState,
  LocalBufferTermState,
  NotebookTerminalType,
  XTermState,
} from './terminal/terminalState'
import ContextState from './contextState'

const NOTEBOOK_SELECTION_COMMAND = '_notebook.selectKernel'

export class NotebookCellManager {
  #data = new WeakMap<NotebookCell, NotebookCellOutputManager>()

  constructor(protected controller: NotebookController) {}

  registerCell(cell: NotebookCell): NotebookCellOutputManager {
    const existing = this.#data.get(cell)
    if (existing) {
      return existing
    }

    const outputs = new NotebookCellOutputManager(cell, this.controller)
    this.#data.set(cell, outputs)

    return outputs
  }

  async createNotebookCellExecution(cell: NotebookCell) {
    const outputs = await this.getNotebookOutputs(cell)
    return outputs.createNotebookCellExecution()
  }

  async getNotebookOutputs(cell: NotebookCell): Promise<NotebookCellOutputManager> {
    const outputs = this.#data.get(cell)
    if (!outputs) {
      console.error(`cell at index ${cell.index} has not been registered!`)
    }

    return outputs ?? this.registerCell(cell)
  }
}

type NotebookOutputs = NotebookCellOutput | readonly NotebookCellOutput[]
interface ICellOption {
  editor?: NotebookEditor
  id: string
}

interface ICellState {
  type: OutputType
  // TODO: Define a better abstraction for integration states.
  state: GitHubState | DenoState | VercelState
}

export class NotebookCellOutputManager {
  protected outputs: readonly NotebookCellOutput[] = []

  protected enabledOutputs = new Map([
    [OutputType.annotations, false],
    [OutputType.deno, false],
    [OutputType.vercel, false],
    [OutputType.github, false],
  ])

  protected cellState?: ICellState

  protected mutex: Mutex = new Mutex()
  protected withLock = this.mutex.withLock.bind(this.mutex)

  protected onFinish = Promise.resolve()
  protected execution?: NotebookCellExecution

  protected terminalState?: ITerminalState
  protected terminalEnabled = false

  constructor(
    protected cell: NotebookCell,
    protected controller: NotebookController,
  ) {}

  protected generateOutputUnsafe(type: OutputType): NotebookCellOutput | undefined {
    const cell = this.cell
    const metadata = cell.metadata as Serializer.Metadata

    switch (type) {
      case OutputType.annotations: {
        const annotationJson: CellOutputPayload<OutputType.annotations> = {
          type: OutputType.annotations,
          output: {
            annotations: getAnnotations(cell),
            validationErrors: validateAnnotations(cell),
            id: cell.metadata['runme.dev/id'],
          },
        }

        return new NotebookCellOutput([
          NotebookCellOutputItem.json(annotationJson, OutputType.annotations),
          // disable to prevent rendering in session outputs
          // NotebookCellOutputItem.json(annotationJson),
        ])
      }

      case OutputType.deno: {
        const payload: CellOutputPayload<OutputType.deno> = {
          type: OutputType.deno,
          output: metadata['runme.dev/denoState'],
        }

        return new NotebookCellOutput([NotebookCellOutputItem.json(payload, OutputType.deno)], {
          deno: { deploy: true },
        })
      }

      case OutputType.vercel: {
        const json: CellOutputPayload<OutputType.vercel> = {
          type: OutputType.vercel,
          output: this.getCellState(type) ?? {
            outputItems: [],
          },
        }

        return new NotebookCellOutput([NotebookCellOutputItem.json(json, OutputType.vercel)])
      }

      case OutputType.outputItems:
      case OutputType.terminal: {
        const terminalState = this.terminalState
        if (!terminalState) {
          return
        }

        const { 'runme.dev/id': cellId, terminalRows } = getAnnotations(cell)
        if (!cellId) {
          throw new Error('Cannot open cell terminal with invalid ID!')
        }

        const stdoutBase64 = terminalState.serialize()
        if (type === OutputType.terminal) {
          let terminalOutputItem: NotebookCellOutputItem | undefined

          const terminalStateStr = terminalState.serialize()
          if (!terminalOutputItem) {
            const terminalConfigurations = getNotebookTerminalConfigurations()
            const json: CellOutputPayload<OutputType.terminal> = {
              type: OutputType.terminal,
              output: {
                'runme.dev/id': cellId,
                content: stdoutBase64,
                initialRows: terminalRows || terminalConfigurations.rows,
                enableShareButton: isRunmeAppButtonsEnabled(),
                isAutoSaveEnabled: ContextState.getKey(NOTEBOOK_AUTOSAVE_ON),
                ...terminalConfigurations,
              },
            }
            terminalOutputItem = NotebookCellOutputItem.json(json, OutputType.terminal)
          }

          return new NotebookCellOutput(
            [terminalOutputItem, NotebookCellOutputItem.stdout(terminalStateStr)],
            {
              'runme.dev/id': cellId,
            },
          )
        } else {
          const terminalStateBase64 = terminalState.serialize()
          const json: CellOutputPayload<OutputType.outputItems> = {
            type: OutputType.outputItems,
            output: {
              content: terminalStateBase64,
              mime: 'text/plain',
              id: cellId,
            },
          }

          return new NotebookCellOutput([
            NotebookCellOutputItem.json(json, OutputType.outputItems),
            NotebookCellOutputItem.stdout(
              Buffer.from(terminalStateBase64, 'base64').toString('utf-8'),
            ),
          ])
        }
      }

      case OutputType.github: {
        const payload: CellOutputPayload<OutputType.github> = {
          type: OutputType.github,
          output: this.getCellState(type),
        }

        return new NotebookCellOutput([NotebookCellOutputItem.json(payload, OutputType.github)])
      }

      default: {
        return undefined
      }
    }
  }

  registerCellTerminalState(type: NotebookTerminalType): ITerminalState {
    let terminalState: ITerminalState

    switch (type) {
      case 'xterm':
        {
          const _terminalState = new XTermState()
          const _write = _terminalState.write
          const _input = _terminalState.input

          _terminalState.write = (data) => {
            _write.call(_terminalState, data)
            // this.refreshTerminal(_terminalState)
          }

          _terminalState.input = (data: string, wasUserInput: boolean) => {
            _input.call(_terminalState, data, wasUserInput)
          }

          terminalState = _terminalState
        }
        break

      case 'local':
        {
          const _terminalState = new LocalBufferTermState()
          const _write = _terminalState.write

          _terminalState.write = (data) => {
            _write.call(_terminalState, data)
            this.refreshOutput(OutputType.outputItems)
          }

          terminalState = _terminalState
        }
        break
    }

    this.terminalState = terminalState
    return terminalState
  }

  getCellTerminalState(): ITerminalState | undefined {
    return this.terminalState
  }

  private async handleNotebookKernelSelection() {
    // cmd may go away https://github.com/microsoft/vscode/issues/126534#issuecomment-864053106
    const selectionCommandAvailable = await commands
      .getCommands()
      .then((cmds) => cmds.includes(NOTEBOOK_SELECTION_COMMAND))

    if (!selectionCommandAvailable) {
      window.showWarningMessage('Please select a kernel (top right: "Select Kernel") to continue.')
      return
    }
    return await window
      .showInformationMessage('Please select a notebook kernel first to continue.', 'Select Kernel')
      .then((option) => {
        if (!option) {
          return
        }
        commands.executeCommand(NOTEBOOK_SELECTION_COMMAND)
      })
  }

  private async newCellExecution(): Promise<NotebookCellExecution | undefined> {
    try {
      return this.controller.createNotebookCellExecution(this.cell)
    } catch (e: any) {
      if (e.message.toString().includes('controller is NOT associated')) {
        await this.handleNotebookKernelSelection()
        return undefined
      }

      throw e
    }
  }

  async createNotebookCellExecution(): Promise<RunmeNotebookCellExecution | undefined> {
    await this.onFinish

    return await this.withLock(async () => {
      const execution = await this.newCellExecution()
      if (!execution) {
        return undefined
      }

      this.execution = execution

      const wrapper = new RunmeNotebookCellExecution(execution)

      const resetExecution = async () => {
        await this.withLock(async () => {
          if (this.execution === execution) {
            this.execution = undefined
          }
        })
      }

      this.onFinish = new Promise<void>(async (resolve) => {
        // todo: see bug note inside refreshTerminal
        wrapper.onWillEnd(async () => {
          await this.refreshTerminal(this.terminalState)
        })
        wrapper.onEnd(async () => {
          await resetExecution()
          resolve()
        })

        if (wrapper.hasEnded) {
          resolve()
        }
      }).finally(resetExecution)

      return wrapper
    })
  }

  protected hasOutputTypeUnsafe(
    type: OutputType,
    outputs?: readonly NotebookCellOutput[],
  ): boolean {
    outputs ??= this.cell.outputs
    return outputs.some((x) => x.items.some((y) => y.mime === type))
  }

  async replaceOutputs(outputs: NotebookOutputs) {
    await this.refreshOutputInternal(() => {
      this.outputs = outputsAsArray(outputs)
    })
  }

  async toggleOutput(type: OutputType) {
    await this.showOutput(type, () => !this.hasOutputTypeUnsafe(type))
  }

  async showOutput(type: OutputType, shown: boolean | (() => boolean | Promise<boolean>) = true) {
    await this.refreshOutputInternal(async () => {
      this.enabledOutputs.set(type, typeof shown === 'function' ? await shown() : shown)
    })
  }

  async toggleTerminal() {
    await this.showTerminal(() => {
      return !this.terminalEnabled
    })
  }

  async showTerminal(shown: boolean | (() => boolean) = true) {
    await this.refreshOutputInternal(async () => {
      this.terminalEnabled = typeof shown === 'function' ? shown() : shown
    })
  }

  /**
   * Syncs a stdout output item based on the active terminal
   *
   * @param terminalState the terminal's state that should be
   * used to update the output item
   *
   * Unfortunately the replacement behavior appears to be broken
   * which leads to duplication of the output item in the UX
   *
   */
  async refreshTerminal(terminalState: ITerminalState | undefined) {
    await this.withLock(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await this.getExecutionUnsafe(async (exec) => {
        const strTerminalState = terminalState?.serialize() || ''

        if (
          !terminalState ||
          strTerminalState === '' ||
          !this.terminalEnabled ||
          !this.hasOutputTypeUnsafe(OutputType.terminal)
        ) {
          return
        }

        let terminalOutput: NotebookCellOutput | undefined
        let terminalOutputItem: NotebookCellOutputItem | undefined
        for (const out of this.cell.outputs) {
          terminalOutputItem = out.items.find((item) => {
            return item.mime === terminalState.outputType
          })
          if (terminalOutputItem) {
            terminalOutput = out
            break
          }
        }

        if (!terminalOutput || !terminalOutputItem) {
          return
        }

        // deactivated due to some duplication behavior
        // perhaps https://github.com/microsoft/vscode/issues/173577 ?
        // const newStdoutOutputItem = NotebookCellOutputItem.stdout(strTerminalState)
        // await exec.replaceOutputItems([terminalOutputItem, newStdoutOutputItem], terminalOutput)

        // mark document as dirty instead (prompt user to hit save) to avoid data-loss
        const revision = this.cell.metadata[RUNME_TRANSIENT_REVISION] ?? 1

        const notebookEdits = NotebookEdit.updateCellMetadata(this.cell.index, {
          ...(this.cell.metadata || {}),
          [RUNME_TRANSIENT_REVISION]: revision + 1,
        } as Serializer.Metadata)

        const edit = new WorkspaceEdit()
        edit.set(this.cell.notebook.uri, [notebookEdits])

        await workspace.applyEdit(edit)
      })
    })
  }

  /**
   * Refreshes the output list
   *
   * @param type * If present, only refresh output list if the given OutputType(s)
   * are present in the outputs, otherwise does nothing
   */
  async refreshOutput(type?: OutputType | OutputType[]) {
    await this.refreshOutputInternal(() => {
      if (type === undefined) {
        return
      }

      const typeSet = Array.isArray(type) ? type : [type]
      return typeSet.some((t) => this.hasOutputTypeUnsafe(t))
    })
  }

  /**
   * Internal refresh ouptut function. Runs under mutex.
   *
   * @param mutater Optional callback, which runs after enabled outputs are
   * retrieved, but before outputs are replaced. This function should be used to
   * mutate the state of enabled outputs.
   *
   * It can also be used to prevent outputs from being replaced at all, by
   * returning `false`. This is used in the exposed `refreshOutput` function,
   * where the user can prevent refreshing if a certain output type is not
   * present.
   */
  protected async refreshOutputInternal(mutater?: () => Promise<boolean | void> | boolean | void) {
    await this.withLock(async () => {
      await this.getExecutionUnsafe(async (exec) => {
        for (const key of [...this.enabledOutputs.keys()]) {
          this.enabledOutputs.set(key, this.hasOutputTypeUnsafe(key))
        }

        const terminalOutput = this.terminalState?.outputType

        if (terminalOutput) {
          this.terminalEnabled = this.hasOutputTypeUnsafe(terminalOutput)
        }

        if (!((await mutater?.()) ?? true)) {
          return
        }

        let terminalCellOutput =
          this.terminalEnabled && terminalOutput && this.generateOutputUnsafe(terminalOutput)

        await replaceOutput(exec, [
          ...[...this.enabledOutputs.entries()].flatMap(([type, enabled]) => {
            if (!enabled) {
              return []
            }

            const output = this.generateOutputUnsafe(type)
            if (!output) {
              return []
            }

            return [output]
          }),
          ...(terminalCellOutput ? [terminalCellOutput] : []),
          ...this.outputs,
        ])
      })
    })
  }

  protected async getExecutionUnsafe(cb: (exec: NotebookCellExecution) => Promise<void> | void) {
    if (this.execution) {
      await cb?.(this.execution)
      return
    }

    const exec = await this.newCellExecution()
    if (!exec) {
      return
    }

    exec.start(Date.now())

    try {
      await cb(exec)
    } catch (e) {
      throw e
    } finally {
      exec.end(true)
    }
  }

  setState(state: ICellState) {
    this.cellState = state
  }

  getCellState<T>(type: OutputType): T | undefined {
    if (this.cellState?.type !== type) {
      this.cellState = undefined
    }
    return this.cellState?.state as T
  }
}

function outputsAsArray(outputs: NotebookOutputs): readonly NotebookCellOutput[] {
  return Array.isArray(outputs) ? outputs : [outputs]
}

type OnWillEndCallback = () => Promise<void>
type OnEndCallback = (info: { success?: boolean; endTime?: number }) => Promise<void>

export class RunmeNotebookCellExecution implements Disposable {
  private _onEnd?: OnEndCallback
  private _onWillEnd?: OnWillEndCallback

  private _hasEnded = false

  constructor(private exec: NotebookCellExecution) {}

  onEnd(cb: OnEndCallback) {
    this._onEnd = cb
  }

  onWillEnd(cb: OnWillEndCallback) {
    this._onWillEnd = cb
  }

  start(startTime?: number): void {
    return this.exec.start(startTime)
  }

  async end(success: boolean | undefined, endTime?: number): Promise<void> {
    await this._onWillEnd?.()
    this.exec.end(success, endTime)
    await this._onEnd?.({ success, endTime })
    this._hasEnded = true
  }

  dispose() {}

  get hasEnded() {
    return this._hasEnded
  }

  get underlyingExecution() {
    return this.exec
  }
}

export async function updateCellMetadata(cell: NotebookCell, meta: Partial<Serializer.Metadata>) {
  const edit = new WorkspaceEdit()

  const notebookEdit = NotebookEdit.updateCellMetadata(cell.index, {
    ...cell.metadata,
    ...meta,
  })

  edit.set(cell.notebook.uri, [notebookEdit])
  await workspace.applyEdit(edit)
}

export async function getCellById(options: ICellOption): Promise<NotebookCell | undefined> {
  const { editor, id } = options
  for (const document of workspace.notebookDocuments) {
    for (const cell of document.getCells()) {
      if (
        cell.kind !== NotebookCellKind.Code ||
        (editor && cell.document.uri.fsPath !== editor.notebook.uri.fsPath)
      ) {
        continue
      }

      if (cell.metadata?.['runme.dev/id'] === undefined) {
        console.error(`[Runme] Cell with index ${cell.index} lacks id`)
        continue
      }

      if (cell.metadata?.['runme.dev/id'] === id) {
        return cell
      }
    }
  }
}
