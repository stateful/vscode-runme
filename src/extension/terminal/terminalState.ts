import { Terminal as XTerm } from '@xterm/headless'

import { OutputType } from '../../constants'
import { RunnerExitReason } from '../runner'
import { RingBuffer } from '../../ringBuffer'

export type NotebookTerminalType = 'xterm' | 'local'

export interface IProcessInfoState {
  exitReason: RunnerExitReason
  pid: number | undefined
}

export interface ITerminalState {
  serialize(): string
  write(data: string | Uint8Array): void
  input(data: string, wasUserInput: boolean): void

  setProcessInfo(processInfo?: IProcessInfoState): void
  hasProcessInfo(): IProcessInfoState | undefined

  readonly outputType: OutputType
  readonly capacity: number
}

export class XTermState implements ITerminalState {
  readonly outputType = OutputType.terminal

  protected xterm: XTerm
  private processInfo: IProcessInfoState | undefined
  protected buffer: RingBuffer<string>
  private textDecoder = new TextDecoder()

  constructor(readonly capacity: number) {
    this.buffer = this.resetBuffer()

    // TODO: lines/cols
    this.xterm = new XTerm({
      allowProposedApi: true,
    })
  }

  setProcessInfo(processInfo?: IProcessInfoState) {
    this.processInfo = processInfo
  }

  hasProcessInfo(): IProcessInfoState | undefined {
    return this.processInfo
  }

  serialize(): string {
    return this.buffer.getAll().join('')
  }

  write(data: string | Uint8Array): void {
    this.xterm.write(data)
    this.addToBuffer(data)
  }

  addToBuffer(data: string | Uint8Array): void {
    if (typeof data === 'string') {
      this.buffer.push(data)
    } else {
      this.buffer.push(this.textDecoder.decode(data))
    }
  }

  resetBuffer(): RingBuffer<string> {
    // capacity is items vs lines because we don't handle line breaks
    this.buffer = new RingBuffer<string>(this.capacity)
    return this.buffer
  }

  input(data: string, wasUserInput: boolean): void {
    try {
      // @ts-expect-error unexposed method
      this.xterm['_core']['coreService']['triggerDataEvent'](data, wasUserInput)
    } catch (e) {
      console.error(e)
    }
  }
}

export class LocalBufferTermState implements ITerminalState {
  readonly outputType = OutputType.outputItems

  private buffer: RingBuffer<Buffer>
  private processInfo: IProcessInfoState | undefined

  constructor(readonly capacity: number) {
    this.buffer = new RingBuffer<Buffer>(capacity)
  }

  write(data: string | Uint8Array) {
    this.buffer.push(Buffer.from(data))
  }

  // noop
  input(): void {}

  setProcessInfo(processInfo?: IProcessInfoState) {
    this.processInfo = processInfo
  }

  hasProcessInfo(): IProcessInfoState | undefined {
    return this.processInfo
  }

  serialize(): string {
    return Buffer.concat(this.buffer.getAll()).toString('base64')
  }
}

export class XTermSerializer extends XTermState {
  override async write(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      this.xterm.write(data, resolve)
    })
  }
}
