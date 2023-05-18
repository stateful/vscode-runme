import util from 'node:util'

import { window } from 'vscode'

const outputChannel = window.createOutputChannel('Runme')

const COLOR_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const DEFAULT_LOG_LEVEL: LogLevel = 'info'

/**
 * VS Code currently doesn't support colors, see
 * https://github.com/microsoft/vscode/issues/571
 * Therefor keep this minimal.
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m'
} as const
type LogLevel = 'trace' | 'info' | 'warn' | 'error'

function color (color: keyof typeof colors, text: string) {
  return `${colors[color]}${text}${colors.reset}`
}

function log (scope?: string, logLevel: LogLevel = DEFAULT_LOG_LEVEL, ...logParams: string[]) {
  const now = new Date()
  const scopeAddition = scope ? color('yellow', `(${scope})`) : ''
  const prefix = util.format(
    `${color('green' ,'[%s]')} ${color('yellow', '%s')} Runme%s:`,
    now.toISOString(),
    logLevel ?? '',
    scopeAddition
  )
  console.log(prefix, ...logParams)
  outputChannel.appendLine([prefix, ...logParams].join(' ').replace(COLOR_REGEXP, ''))
}

export default function getLogger (scope?: string) {
  return {
    trace: (...logParams: string[]) => log(scope, 'trace', ...logParams),
    info: (...logParams: string[]) => log(scope, 'info', ...logParams),
    warn: (...logParams: string[]) => log(scope, 'warn', ...logParams),
    error: (...logParams: string[]) => log(scope, 'error', ...logParams)
  }
}
