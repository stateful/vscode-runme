import util from 'node:util'

import { window } from 'vscode'

const outputChannel = window.createOutputChannel('Runme')

const COLOR_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g


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

function color (color: keyof typeof colors, text: string) {
  return `${colors[color]}${text}${colors.reset}`
}

function log (scope?: string, ...logParams: string[]) {
  const now = new Date()
  const scopeAddition = scope ? color('yellow', `[${scope}]`) : ''
  const prefix = util.format(
    `${color('green' ,'[%s]')} Runme%s:%s`,
    now.toISOString(),
    scopeAddition,
    // if first log param starts with error symbol make sure to include it here where colors have an effect
    (logParams[0] as string).startsWith(colors.red) ? ` ${logParams.shift()}` : ''
  )
  console.log(prefix, ...logParams)
  outputChannel.appendLine([prefix, ...logParams].join(' ').replace(COLOR_REGEXP, ''))
}

export default function getLogger (scope?: string) {
  return {
    info: (...logParams: unknown[]) => log(scope, ...logParams),
    error: (...logParams: unknown[]) => log(scope, `${color('red', 'Error')} -`, ...logParams)
  }
}
