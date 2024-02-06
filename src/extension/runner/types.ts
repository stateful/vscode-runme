import { TerminalDimensions } from 'vscode'

import { DisposableAsync } from '../../types'

export interface IRunnerChild extends DisposableAsync {}

export interface TerminalWindowState {
  dimensions?: TerminalDimensions
  opened: boolean
  /**
   * Used in VS Code to determine if this is part of the initial call to
   * `setDimensions`, which generally should be ignored
   */
  hasSetDimensions?: boolean
}
