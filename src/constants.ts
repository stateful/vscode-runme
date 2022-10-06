export enum OutputType {
  shell = 'stateful.runme/shell-stdout',
  vercel = 'stateful.runme/vercel-stdout',
  html = 'stateful.runme/html-stdout',
  script = 'stateful.runme/script-stdout',
  error = 'error'
}

export const CONFIGURATION_SHELL_DEFAULTS = {
  interactive: true,
  closeTerminalOnSuccess: true
} as const

export const DEFAULT_ENV = { RUNME_TASK: 'true' }
export const ENV_STORE = new Map<string, string>(
  Object.entries(DEFAULT_ENV)
)
