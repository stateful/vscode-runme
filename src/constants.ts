/**
 * Note: this file is used within Node.js and Browser environment.
 * Only export cross compatible objects here.
 */

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
