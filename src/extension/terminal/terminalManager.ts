import { Disposable } from 'vscode'

import { RunmeTerminal } from '../../types'
import { getTerminalRunmeId } from '../utils'

export type ActiveTerminal = RunmeTerminal & { executionId: number }

export class TerminalManager implements Disposable {
  protected static terminals: ActiveTerminal[] = []

  dispose() {
    TerminalManager.terminals = []
  }

  static register(terminal: RunmeTerminal, executionId: number) {
    const exists = this.terminals.find((t) => t.executionId === executionId)
    if (!exists) {
      this.terminals.push({ ...terminal, executionId })
    }
  }

  static getTerminal(runmeId: string) {
    return this.terminals.find((t) => {
      return getTerminalRunmeId(t) === runmeId
    }) as RunmeTerminal | undefined
  }
}
