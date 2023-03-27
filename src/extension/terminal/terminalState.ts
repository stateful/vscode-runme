import { Terminal as XTerm } from 'xterm-headless'
import { SerializeAddon } from 'xterm-addon-serialize'

export type NotebookTerminalType = 'xterm'

export interface ITerminalState {
  serialize(): string
  write(data: string | Uint8Array): void
  input(data: string, wasUserInput: boolean): void
}

export class XTermState implements ITerminalState {
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
    // @ts-expect-error unexposed method
    this.xterm['coreService']['triggerDataEvent'](data, wasUserInput)
  }
}
