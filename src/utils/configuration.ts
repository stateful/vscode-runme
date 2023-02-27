import { join } from 'node:path'

import { workspace } from 'vscode'
import { z } from 'zod'

const SERVER_SECTION_NAME = 'runme.server'

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
            .transform((schema) => {
                return schema || 'bin/runme'
            }),
        enableLogger: z
            .boolean()
            .default(false)
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

const getPortNumber = (): number => {
    return getServerConfigurationValue<number>('port', 7863)
}

const getPath = (): string => {
    const binaryPath = getServerConfigurationValue<string>('binaryPath', 'bin/runme')

    if (!binaryPath.startsWith('/')) {
      return join(__dirname, '../../', binaryPath)
    }

    return binaryPath
}

const enableServerLogs = (): boolean => {
    return getServerConfigurationValue<boolean>('enableLogger', false)
}

export {
    getPortNumber,
    getPath,
    enableServerLogs
}
