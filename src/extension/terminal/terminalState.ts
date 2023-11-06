import { Terminal as XTerm } from 'xterm-headless'
import { SerializeAddon } from 'xterm-addon-serialize'

import { OutputType } from '../../constants'
import { RunnerExitReason } from '../runner'

export type NotebookTerminalType = 'xterm' | 'local'

interface IProcessInfo {
  pid: number | undefined
  exitReason: RunnerExitReason
}

export interface ITerminalState {
  serialize(): string
  write(data: string | Uint8Array): void
  input(data: string, wasUserInput: boolean): void

  setProcessInfo(processInfo?: IProcessInfo): void
  hasProcessInfo(): IProcessInfo | undefined

  readonly outputType: OutputType
}

export class XTermState implements ITerminalState {
  readonly outputType = OutputType.terminal

  private xterm: XTerm
  private serializer: SerializeAddon
  private processInfo: IProcessInfo | undefined

  constructor() {
    // TODO: lines/cols
    this.xterm = new XTerm({
      allowProposedApi: true,
    })

    this.serializer = new SerializeAddon()
    this.xterm.loadAddon(this.serializer)
  }

  setProcessInfo(processInfo?: IProcessInfo) {
    this.processInfo = processInfo
  }

  hasProcessInfo(): IProcessInfo | undefined {
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
  private processInfo: IProcessInfo | undefined

  write(data: string | Uint8Array) {
    this.output.push(Buffer.from(data))
  }

  // noop
  input(): void {}

  setProcessInfo(processInfo?: IProcessInfo) {
    this.processInfo = processInfo
  }

  hasProcessInfo(): IProcessInfo | undefined {
    return this.processInfo
  }

  serialize(): string {
    return Buffer.concat(this.output).toString('base64')
  }
}
