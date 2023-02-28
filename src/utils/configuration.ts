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
                return schema || 'bin'
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

const getPath = (basePath: string, platform: string): string => {
    const sep = platform.toLowerCase().startsWith('win') ? '\\' : '/'
    const binaryPath = getServerConfigurationValue<string>('binaryPath', 'bin')

    if (
      !binaryPath.startsWith(sep) &&
      binaryPath.length > 2 &&
      binaryPath[1] !== ':'
    ) {
      return `${basePath}${sep}${binaryPath}`
    }

    return binaryPath
}

const getBinaryLocation = (binaryPath: string, platform: string) => {
    const isWin = platform.toLowerCase().startsWith('win')
    const platformSep = isWin ? '\\' : '/'
    const binName = isWin ? 'runme.exe' : 'runme'
    const sep = binaryPath.endsWith(platformSep) ? '' : platformSep
    return `${binaryPath}${sep}${binName}`
}

const enableServerLogs = (): boolean => {
    return getServerConfigurationValue<boolean>('enableLogger', false)
}

export {
    getBinaryLocation,
    getPortNumber,
    getPath,
    enableServerLogs
}
