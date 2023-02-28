import { Uri, workspace } from 'vscode'
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

const getPath = (basePath: string): string => {
    const baseUri = Uri.parse(basePath)
    const binaryPath = getServerConfigurationValue<string>('binaryPath', 'bin')

    // relative path
    if (
      !binaryPath.startsWith('/') &&
      binaryPath.length > 2 &&
      binaryPath[1] !== ':'
    ) {
      return Uri.joinPath(baseUri, binaryPath).fsPath
    }

    return binaryPath
}

const getBinaryLocation = (binaryPath: string, platform: string): string => {
    const isWin = platform.toLowerCase().startsWith('win')
    const binName = isWin ? 'runme.exe' : 'runme'
    const pathUri = Uri.parse(binaryPath)
    return Uri.joinPath(pathUri, binName).fsPath
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
