import {
  ExtensionContext,
  NotebookCellExecution,
  NotebookRendererMessaging,
  TextDocument,
} from 'vscode'

import { ENV_STORE, DEFAULT_ENV } from '../constants'
import { NotebookCellOutputManager } from '../cell'
import { Kernel } from '../kernel'

import { sh, bash } from './task'
import { vercel } from './vercel'
import { deno } from './deno'
import { github } from './github'
import { gcp } from './gcp'
import { aws } from './aws'

export interface IKernelExecutorOptions {
  context: ExtensionContext
  kernel: Kernel
  doc: TextDocument
  exec: NotebookCellExecution
  outputs: NotebookCellOutputManager
  messaging: NotebookRendererMessaging
  envMgr: IEnvironmentManager
  runScript?: () => Promise<boolean>
}

export type IKernelExecutor = (executor: IKernelExecutorOptions) => Promise<boolean>

// TODO: want to use a better abstraction than this
export interface IEnvironmentManager {
  set(key: string, value: string | undefined): Promise<void> | void
  get(key: string): Promise<string | undefined> | string | undefined
  reset(): Promise<void> | void
}

export const ENV_STORE_MANAGER: IEnvironmentManager = {
  get: (key) => ENV_STORE.get(key),
  set: (key, val = '') => {
    ENV_STORE.set(key, val)
  },
  reset: () => {
    ;[...ENV_STORE.keys()].forEach((key) => ENV_STORE.delete(key))
    Object.entries(DEFAULT_ENV).map(([key, val]) => ENV_STORE.set(key, val))
  },
}

export default { sh, bash, vercel, deno, github, gcp, aws }
