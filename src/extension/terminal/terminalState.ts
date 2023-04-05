import { Terminal as XTerm } from 'xterm-headless'
import { SerializeAddon } from 'xterm-addon-serialize'

import { OutputType } from '../../constants'

export type NotebookTerminalType = 'xterm'|'local'

export interface ITerminalState {
  serialize(): string
  write(data: string | Uint8Array): void
  input(data: string, wasUserInput: boolean): void

  readonly outputType: OutputType
}

export class XTermState implements ITerminalState {
  readonly outputType = OutputType.terminal

  private xterm: XTerm
  private serializer: SerializeAddon

  constructor() {
    // TODO: lines/cols
    this.xterm = new XTerm({
      allowProposedApi: true,
    })

    this.serializer = new SerializeAddon()
    this.xterm.loadAddon(this.serializer)
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

  private buf: string = ''

  write(data: string | Uint8Array) {
    this.buf += data.toString()
  }

  // noop
  input(): void { }

  serialize(): string { return this.buf }
}
