import path from 'node:path'
import os from 'node:os'

import { Uri, workspace } from 'vscode'
import { z } from 'zod'

const SERVER_SECTION_NAME = 'runme.server'
const TERMINAL_SECTION_NAME= 'runme.terminal'
const DEFAULT_TLS_DIR = path.join(os.tmpdir(), 'runme', 'tls')

const configurationSchema = {
    server: {
        port: z
            .number()
            .positive()
            .min(8080)
            .max(9090)
            .default(7863),
        binaryPath: z
            .string()
            .optional(),
        enableLogger: z
            .boolean()
            .default(false),
        enableTLS: z
            .boolean()
            .default(true),
        tlsDir: z
            .string()
            .nonempty()
            .default(DEFAULT_TLS_DIR),
    },
    terminal: {
        enabled: z.boolean().default(false)
    }
}

const getServerConfigurationValue = <T>(configName: keyof typeof configurationSchema.server, defaultValue: T) => {
    const configurationSection = workspace.getConfiguration(SERVER_SECTION_NAME)
    const configurationValue = configurationSection.get<T>(configName)!
    const parseResult = configurationSchema.server[configName].safeParse(configurationValue)
    if (parseResult.success) {
        return parseResult.data as T
    }
    return defaultValue
}

const getRunmeTerminalConfiguration = <T>(configName: keyof typeof configurationSchema.terminal, defaultValue: T) => {
    const configurationSection = workspace.getConfiguration(TERMINAL_SECTION_NAME)
    const configurationValue = configurationSection.get<T>(configName)!
    const parseResult = configurationSchema.terminal[configName].safeParse(configurationValue)
    if (parseResult.success) {
        return parseResult.data as T
    }
return defaultValue
}

const getPortNumber = (): number => {
    return getServerConfigurationValue<number>('port', 7863)
}

const getTLSEnabled = (): boolean => {
  return getServerConfigurationValue('enableTLS', true)
}

const getTLSDir = (): string => {
  return getServerConfigurationValue('tlsDir', DEFAULT_TLS_DIR)
}

const getBinaryPath = (extensionBaseUri: Uri, platform: string): Uri => {
    const userPath = getServerConfigurationValue<string | undefined>('binaryPath', undefined)

    const isWin = platform.toLowerCase().startsWith('win')
    const binName = isWin ? 'runme.exe' : 'runme'
    const bundledPath = Uri.joinPath(extensionBaseUri, 'bin', binName)

    if (userPath) {
        if (path.isAbsolute(userPath)) {
            return Uri.file(userPath)
        } else if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
            return Uri.joinPath(workspace.workspaceFolders[0].uri, userPath)
        }
    }

    return bundledPath
}

const enableServerLogs = (): boolean => {
    return getServerConfigurationValue<boolean>('enableLogger', false)
}

const isRunmeIntegratedTerminalEnabled = (): boolean => {
    return getRunmeTerminalConfiguration('enabled', false)
}

export {
    getPortNumber,
    getBinaryPath,
    enableServerLogs,
    getServerConfigurationValue,
    isRunmeIntegratedTerminalEnabled,
    getTLSEnabled,
    getTLSDir,
}
