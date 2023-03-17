import {
  Disposable,
  NotebookCell,
  NotebookCellExecution,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookController,
  NotebookEdit,
  workspace,
  WorkspaceEdit
} from 'vscode'

import { OutputType } from '../constants'
import { CellOutputPayload, Serializer } from '../types'
import { Mutex } from '../utils/sync'

import { getAnnotations, replaceOutput, validateAnnotations } from './utils'

export class NotebookCellManager {
  private data = new WeakMap<NotebookCell, NotebookCellOutputManager>()

  constructor(
    protected controller: NotebookController
  ) { }

  registerCell(cell: NotebookCell) {
    if(this.data.has(cell)) { return }
    this.data.set(cell, new NotebookCellOutputManager(cell, this.controller))
  }

  async createNotebookCellExecution(cell: NotebookCell) {
    const outputs = await this.getNotebookOutputs(cell)
    return outputs.createNotebookCellExecution()
  }

  async getNotebookOutputs(cell: NotebookCell): Promise<NotebookCellOutputManager> {
    const outputs = this.data.get(cell)
    if(!outputs) {
      throw new Error(`cell at index ${cell.index} has not been registered!`)
    }

    return outputs
  }
}

type NotebookOutputs = NotebookCellOutput | readonly NotebookCellOutput[]

export class NotebookCellOutputManager {
  protected outputs: readonly NotebookCellOutput[] = []

  protected enabledOutputs = new Map([
    [OutputType.annotations, false],
    [OutputType.deno, false],
    [OutputType.vercel, false],
  ])

  protected mutex: Mutex = new Mutex()
  protected withLock = this.mutex.withLock.bind(this.mutex)

  protected onFinish = Promise.resolve()
  protected execution?: NotebookCellExecution

  constructor(
    protected cell: NotebookCell,
    protected controller: NotebookController
  ) { }

  protected static generateOutput(cell: NotebookCell, type: OutputType): NotebookCellOutput|undefined {
    const metadata = cell.metadata as Serializer.Metadata

    switch(type) {
      case OutputType.annotations: {
        const annotationJson: CellOutputPayload<OutputType.annotations> = {
          type: OutputType.annotations,
          output: {
            annotations: getAnnotations(cell),
            validationErrors: validateAnnotations(cell)
          },
        }

        return new NotebookCellOutput([
          NotebookCellOutputItem.json(annotationJson, OutputType.annotations),
          NotebookCellOutputItem.json(annotationJson),
        ])
      }

      case OutputType.deno: {
        const payload: CellOutputPayload<OutputType.deno> = {
          type: OutputType.deno,
          output: metadata['runme.dev/denoState'],
        }

        return new NotebookCellOutput([
          NotebookCellOutputItem.json(payload, OutputType.deno)
        ], { deno: { deploy: true } })
      }

      case OutputType.vercel: {
        const json: CellOutputPayload<OutputType.vercel> = {
          type: OutputType.vercel,
          output: metadata['runme.dev/vercelState'] ?? {
            outputItems: [],
          },
        }

        return new NotebookCellOutput([
          NotebookCellOutputItem.json(json, OutputType.vercel)
        ])
      }

      default: {
        return undefined
      }
    }
  }

  async createNotebookCellExecution(): Promise<RunmeNotebookCellExecution> {
    await this.onFinish

    return await this.withLock(() => {
      const execution = this.controller.createNotebookCellExecution(this.cell)
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
        wrapper.onEnd(async () => {
          await resetExecution()
          resolve()
        })

        if(wrapper.hasEnded) {
          resolve()
        }
      }).finally(resetExecution)

      return wrapper
    })
  }

  protected hasOutputTypeUnsafe(type: OutputType, cells?: readonly NotebookCellOutput[]): boolean {
    cells ??= this.cell.outputs
    return cells.some(x => x.items.some(y => y.mime === type))
  }

  async replaceOutputs(outputs: NotebookOutputs) {
    await this.refreshOutputs(() => {
      this.outputs = outputsAsArray(outputs)
    })
  }

  async toggleOutput(type: OutputType) {
    await this.showOutput(type, () => !this.hasOutputTypeUnsafe(type))
  }

  async showOutput(type: OutputType, shown: boolean|(() => boolean|Promise<boolean>) = true) {
    await this.refreshOutputs(async () => {
      this.enabledOutputs.set(type, typeof shown === 'function' ? await shown() : shown)
    })
  }

  protected async refreshOutputs(cb?: () => Promise<void>|void) {
    await this.withLock(async () => {
      await this.getExecutionUnsafe(async (exec) => {
        for(const key of [...this.enabledOutputs.keys()]) {
          this.enabledOutputs.set(key, this.hasOutputTypeUnsafe(key))
        }

        await cb?.()

        await replaceOutput(exec, [
          ...[ ...this.enabledOutputs.entries() ]
            .flatMap(([type, enabled]) => {
              if (!enabled) { return [] }

              const output = NotebookCellOutputManager.generateOutput(this.cell, type)
              if(!output) { return [] }

              return [ output ]
            }),
          ...this.outputs,
        ])
      })
    })
  }

  protected async getExecutionUnsafe(cb: (exec: NotebookCellExecution) => Promise<void>|void) {
    if(this.execution) {
      await cb?.(this.execution)
      return
    }

    const exec = this.controller.createNotebookCellExecution(this.cell)
    exec.start(Date.now())

    try {
      await cb(exec)
    } catch(e) {
      throw e
    } finally {
      exec.end(true)
    }
  }
}

function outputsAsArray(outputs: NotebookOutputs): readonly NotebookCellOutput[] {
  return Array.isArray(outputs) ? outputs : [ outputs ]
}

type OnEndCallback = (info: {
  success?: boolean
  endTime?: number
}) => Promise<void>

export class RunmeNotebookCellExecution implements Disposable {
  private _onEnd?: OnEndCallback

  private _hasEnded = false

  constructor(
    private exec: NotebookCellExecution,
  ) { }

  onEnd(cb: OnEndCallback) {
    this._onEnd = cb
  }

  start(startTime?: number): void {
    return this.exec.start(startTime)
  }

  async end(success: boolean | undefined, endTime?: number): Promise<void> {
    this.exec.end(success, endTime)
    await this._onEnd?.({ success, endTime })
    this._hasEnded = true
  }

  dispose() { }

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
