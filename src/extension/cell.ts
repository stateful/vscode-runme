import {
  Disposable,
  NotebookCell,
  NotebookCellExecution,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookController
} from 'vscode'

import { OutputType } from '../constants'
import { CellOutputPayload } from '../types'
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

  protected annotationsEnabled: boolean = false

  protected mutex: Mutex = new Mutex()
  protected withLock = this.mutex.withLock.bind(this.mutex)

  protected onFinish = Promise.resolve()
  protected execution?: NotebookCellExecution

  constructor(
    protected cell: NotebookCell,
    protected controller: NotebookController
  ) { }

  protected static generateAnnotationOutput(cell: NotebookCell): NotebookCellOutput {
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

  async replaceOutputs(outputs: NotebookOutputs) {
    await this.refreshOutputs(() => {
      this.outputs = outputsAsArray(outputs)
    })
  }

  async toggleAnnotations() {
    await this.refreshOutputs(() => {
      this.annotationsEnabled = !this.annotationsEnabled
    })
  }

  protected async refreshOutputs(cb?: () => Promise<void>|void) {
    await this.withLock(async () => {
      await cb?.()
      await this.refreshOutputsUnsafe()
    })
  }

  protected async refreshOutputsUnsafe() {
    await this.getExecutionUnsafe(async (exec) => {
      await replaceOutput(exec, [
        ...this.annotationsEnabled ? [ NotebookCellOutputManager.generateAnnotationOutput(this.cell) ] : [],
        ...this.outputs,
      ])
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
