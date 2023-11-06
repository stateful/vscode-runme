import path from 'node:path'
import os from 'node:os'

import { ExtensionContext, NotebookCell, Uri, workspace } from 'vscode'
import { z } from 'zod'

import { getAnnotations, isWindows } from '../extension/utils'
import { SERVER_PORT } from '../constants'
import { RunmeIdentity } from '../extension/grpc/serializerTypes'

const ACTIONS_SECTION_NAME = 'runme.actions'
const SERVER_SECTION_NAME = 'runme.server'
const TERMINAL_SECTION_NAME = 'runme.terminal'
const CODELENS_SECTION_NAME = 'runme.codelens'
const ENV_SECTION_NAME = 'runme.env'
const CLI_SECTION_NAME = 'runme.cli'
const APP_SECTION_NAME = 'runme.app'

export const OpenViewInEditorAction = z.enum(['split', 'toggle'])
const DEFAULT_WORKSPACE_FILE_ORDER = ['.env.local', '.env']
const DEFAULT_RUNME_APP_API_URL = 'https://api.runme.dev'
const DEFAULT_RUNME_BASE_DOMAIN = 'runme.dev'
const DEFAULT_RUNME_REMOTE_DEV = 'staging.runme.dev'
const APP_LOOPBACKS = ['127.0.0.1', 'localhost']
const APP_LOOPBACK_MAPPING = new Map<string, string>([
  ['api.', ':4000'],
  ['app.', ':4001'],
])

type NotebookTerminalValue = keyof typeof notebookTerminalSchema

const editorSettings = workspace.getConfiguration('editor')
const terminalSettings = workspace.getConfiguration('terminal.integrated')
const notebookTerminalSchema = {
  backgroundTask: z.boolean().default(true),
  nonInteractive: z.boolean().default(false),
  interactive: z.boolean().default(true),
  fontSize: z.number().default(editorSettings.get<number>('fontSize', 10)),
  fontFamily: z
    .string()
    .default(editorSettings.get<string>('fontFamily', terminalSettings.get('fontFamily', 'Arial'))),
  rows: z.number().int().default(10),
  cursorStyle: z.enum(['block', 'bar', 'underline']).default('bar'),
  cursorBlink: z.boolean().default(true).optional(),
  cursorWidth: z.number().min(1).optional(),
  smoothScrollDuration: z.number().optional(),
  scrollback: z.number().optional(),
}

const configurationSchema = {
  actions: {
    openViewInEditor: OpenViewInEditorAction.default('split'),
  },
  server: {
    customAddress: z.string().min(1).optional(),
    binaryPath: z.string().optional(),
    enableLogger: z.boolean().default(false),
    enableTLS: z.boolean().default(true),
    tlsDir: z.string().optional(),
    transportType: z.enum(['TCP', 'UDS']).default('TCP'),
    persistIdentity: z.nativeEnum(RunmeIdentity).default(RunmeIdentity.ALL),
  },
  codelens: {
    enable: z.boolean().default(true),
  },
  env: {
    workspaceFileOrder: z.array(z.string()).default(DEFAULT_WORKSPACE_FILE_ORDER),
    loadWorkspaceFiles: z.boolean().default(true),
  },
  cli: {
    useIntegratedRunme: z.boolean().default(false),
  },
  app: {
    apiUrl: z.string().default(DEFAULT_RUNME_APP_API_URL),
    baseDomain: z.string().default(DEFAULT_RUNME_BASE_DOMAIN),
    enableShare: z.boolean().default(true),
    forceNewWindow: z.boolean().default(true),
  },
}

const notebookTerminalSchemaObject = z.object(notebookTerminalSchema)
export type TerminalConfiguration = z.infer<typeof notebookTerminalSchemaObject>
export type ServerTransportType = z.infer<typeof configurationSchema.server.transportType>
export type ServerPersistIdentity = z.infer<typeof configurationSchema.server.persistIdentity>

const getActionsConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.actions,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(ACTIONS_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.actions[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getServerConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.server,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(SERVER_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.server[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getRunmeTerminalConfigurationValue = <T>(
  configName: NotebookTerminalValue,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(TERMINAL_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = notebookTerminalSchema[configName].safeParse(
    configurationValue === null ? undefined : configurationValue,
  )
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getCodeLensConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.codelens,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(CODELENS_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.codelens[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getEnvConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.env,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(ENV_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.env[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getCloudConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.app,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(APP_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.app[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getCLIConfigurationValue = <T>(
  configName: keyof typeof configurationSchema.cli,
  defaultValue: T,
) => {
  const configurationSection = workspace.getConfiguration(CLI_SECTION_NAME)
  const configurationValue = configurationSection.get<T>(configName)!
  const parseResult = configurationSchema.cli[configName].safeParse(configurationValue)
  if (parseResult.success) {
    return parseResult.data as T
  }
  return defaultValue
}

const getPortNumber = (): number => {
  return SERVER_PORT
}

const getCustomServerAddress = (): string | undefined => {
  return getServerConfigurationValue<string | undefined>('customAddress', undefined)
}

const getTLSEnabled = (): boolean => {
  if (isWindows()) {
    // disable on windows until we figure out file permissions
    return false
  }

  return getServerConfigurationValue('enableTLS', true)
}

const getTLSDir = (extensionsDir: Uri): string => {
  return (
    getServerConfigurationValue('tlsDir', undefined) || Uri.joinPath(extensionsDir, 'tls').fsPath
  )
}

const getBinaryPath = (extensionBaseUri: Uri, platform = os.platform()): Uri => {
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

const isNotebookTerminalFeatureEnabled = (
  featureName: keyof typeof notebookTerminalSchema,
): boolean => {
  return getRunmeTerminalConfigurationValue(featureName, false)
}

const getNotebookTerminalConfigurations = () => {
  const schema = z.object(notebookTerminalSchema)
  const keys = Object.keys(notebookTerminalSchema) as Array<keyof typeof notebookTerminalSchema>
  return keys.reduce(
    (p, c) => {
      p[c] = getRunmeTerminalConfigurationValue<never>(c, undefined as never)
      return p
    },
    {} as z.infer<typeof schema>,
  )
}

const isNotebookTerminalEnabledForCell = (cell: NotebookCell): boolean => {
  const { interactive, background } = getAnnotations(cell)

  return interactive
    ? background
      ? isNotebookTerminalFeatureEnabled('backgroundTask')
      : isNotebookTerminalFeatureEnabled('interactive')
    : isNotebookTerminalFeatureEnabled('nonInteractive')
}

const getCodeLensEnabled = (): boolean => {
  return getCodeLensConfigurationValue<boolean>('enable', true)
}

const registerExtensionEnvironmentVariables = (context: ExtensionContext): void => {
  context.environmentVariableCollection.prepend(
    'PATH',
    path.dirname(getBinaryPath(context.extensionUri).fsPath) + (isWindows() ? ';' : ':'),
  )
}

const getActionsOpenViewInEditor = () => {
  type ActionEnum = z.infer<typeof OpenViewInEditorAction>
  return getActionsConfigurationValue<ActionEnum>(
    'openViewInEditor',
    OpenViewInEditorAction.enum.split,
  )
}

const getEnvWorkspaceFileOrder = (): string[] => {
  return getEnvConfigurationValue('workspaceFileOrder', DEFAULT_WORKSPACE_FILE_ORDER)
}

const getEnvLoadWorkspaceFiles = (): boolean => {
  return getEnvConfigurationValue('loadWorkspaceFiles', true)
}

const getCLIUseIntegratedRunme = (): boolean => {
  return getCLIConfigurationValue('useIntegratedRunme', false)
}

const getRemoteDev = (baseDomain: string): boolean => {
  const localDev = APP_LOOPBACKS.map((host) =>
    Uri.from({ scheme: 'http', authority: host }).toString().slice(0, -1),
  )
  return localDev.map((uri) => baseDomain.startsWith(uri)).reduce((p, c) => p || c)
}

const getRunmeAppUrl = (subdomains: string[]): string => {
  let base = getRunmeBaseDomain()
  const isRemoteDev = getRemoteDev(base)
  if (isRemoteDev) {
    if (subdomains.length === 1 && subdomains?.[0] === 'app') {
      return base
    } else {
      base = DEFAULT_RUNME_REMOTE_DEV
    }
  }

  const isLoopback = APP_LOOPBACKS.map((host) => base.includes(host)).reduce((p, c) => p || c)
  const scheme = isLoopback ? 'http' : 'https'

  let sub = subdomains.join('.')
  if (sub.length > 0) {
    sub = `${sub}.`
  }

  let port = ''
  if (isLoopback && sub.length > 0) {
    port = APP_LOOPBACK_MAPPING.get(sub) ?? ''
    sub = ''
  }

  const endpoint = Uri.parse(`${scheme}://${sub}${base}${port}`, true)
  return endpoint.toString()
}

const getRunmeBaseDomain = (): string => {
  const baseDomain = getCloudConfigurationValue('baseDomain', DEFAULT_RUNME_BASE_DOMAIN)
  if (baseDomain.length === 0) {
    return DEFAULT_RUNME_BASE_DOMAIN
  }
  return baseDomain
}

const isRunmeAppButtonsEnabled = (): boolean => {
  return getCloudConfigurationValue('enableShare', true)
}

const getRunmePanelIdentifier = (identifer: string): string => {
  const configurationSection = workspace.getConfiguration(`${APP_SECTION_NAME}.panel`)
  const configurationValue = configurationSection.get<string>(identifer) || identifer
  return configurationValue
}

const getForceNewWindowConfig = (): boolean => {
  return getCloudConfigurationValue('forceNewWindow', true)
}

export {
  getPortNumber,
  getBinaryPath,
  enableServerLogs,
  getServerConfigurationValue,
  isNotebookTerminalFeatureEnabled,
  isNotebookTerminalEnabledForCell,
  getTLSEnabled,
  getTLSDir,
  getNotebookTerminalConfigurations,
  getCodeLensEnabled,
  registerExtensionEnvironmentVariables,
  getCustomServerAddress,
  getActionsOpenViewInEditor,
  getEnvWorkspaceFileOrder,
  getEnvLoadWorkspaceFiles,
  getCLIUseIntegratedRunme,
  getRunmeAppUrl,
  getRunmePanelIdentifier,
  isRunmeAppButtonsEnabled,
  getForceNewWindowConfig,
}
