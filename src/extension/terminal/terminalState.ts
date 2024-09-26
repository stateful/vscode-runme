import { Terminal as XTerm } from '@xterm/headless'
import { SerializeAddon } from '@xterm/addon-serialize'

import { OutputType } from '../../constants'
import { RunnerExitReason } from '../runner'

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
}

export class XTermState implements ITerminalState {
  readonly outputType = OutputType.terminal

  protected xterm: XTerm
  private serializer: SerializeAddon
  private processInfo: IProcessInfoState | undefined

  constructor() {
    // TODO: lines/cols
    this.xterm = new XTerm({
      allowProposedApi: true,
    })

    this.serializer = new SerializeAddon()
    this.xterm.loadAddon(this.serializer)
  }

  setProcessInfo(processInfo?: IProcessInfoState) {
    this.processInfo = processInfo
  }

  hasProcessInfo(): IProcessInfoState | undefined {
    return this.processInfo
  }

  serialize(): string {
    return this.serializer.serialize()
  }

  write(data: string | Uint8Array): void {
    this.xterm.write(data)
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

  private output: Buffer[] = []
  private processInfo: IProcessInfoState | undefined

  write(data: string | Uint8Array) {
    this.output.push(Buffer.from(data))
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
    return Buffer.concat(this.output).toString('base64')
  }
}

export class XTermSerializer extends XTermState {
  override async write(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      this.xterm.write(data, resolve)
    })
  }
}
