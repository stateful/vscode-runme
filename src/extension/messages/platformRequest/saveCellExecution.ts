import os from 'node:os'

import { NotebookData, Uri, env, workspace } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import getMAC from 'getmac'

import { ClientMessages, NOTEBOOK_AUTOSAVE_ON } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { postClientMessage } from '../../../utils/messaging'
import ContextState from '../../contextState'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'
import { getGitContext, getPlatformAuthSession } from '../../utils'
import { GrpcSerializer } from '../../serializer'
import { InitializeClient } from '../../api/client'
import {
  CreateExtensionCellOutputDocument,
  ReporterFrontmatterInput,
} from '../../__generated-platform__/graphql'
import { Cell } from '../../grpc/serializerTypes'
export type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('SaveCell')

export default async function saveCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage
  // Save the file to ensure the serialization completes before saving the cell execution.
  // This guarantees we access the latest cache state of the serializer.
  await editor.notebook.save()

  log.info('Saving cell execution')

  const escalationButton = kernel.hasExperimentEnabled('escalationButton', false)!
  const cacheId = GrpcSerializer.getDocumentCacheId(editor.notebook.metadata) as string
  const plainSessionOutput = await kernel.getPlainCache(cacheId)
  const maskedSessionOutput = await kernel.getMaskedCache(cacheId)

  log.info(`escalationButton: ${escalationButton ? 'enabled' : 'disabled'}`)

  const vsEnv = {
    appHost: env.appHost,
    appName: env.appName,
    appRoot: env.appRoot,
    isNewAppInstall: env.isNewAppInstall,
    language: env.language,
    machineId: env.machineId,
    remoteName: env.remoteName || '',
    sessionId: env.sessionId,
    shell: env.shell,
    uiKind: env.uiKind,
    uriScheme: env.uriScheme,
  }

  try {
    const autoSaveIsOn = ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON)
    const createIfNone = !message.output.data.isUserAction && autoSaveIsOn ? false : true
    const session = await getPlatformAuthSession(createIfNone)

    if (!session) {
      return postClientMessage(messaging, ClientMessages.platformApiResponse, {
        data: {
          displayShare: false,
        },
        escalationButton,
        id: message.output.id,
      })
    }

    const path = editor.notebook.uri.fsPath
    const gitCtx = await getGitContext(path)
    const filePath = gitCtx.repository ? `${gitCtx.relativePath}${path?.split('/').pop()}` : path
    const fileContent = path ? await workspace.fs.readFile(Uri.file(path)) : undefined

    const notebookData = kernel.getNotebookDataCache(cacheId) as NotebookData
    const notebook = GrpcSerializer.marshalNotebook(notebookData, {
      kernel,
      marshalFrontmatter: true,
    })

    const cell = notebook?.cells.find((c) => c.metadata.id === message.output.id) as Cell

    const graphClient = InitializeClient({ runmeToken: session.accessToken })

    // TODO: Implement the reporter to normalize the data into a valid Platform api payload
    const result = await graphClient.mutate({
      mutation: CreateExtensionCellOutputDocument,
      variables: {
        input: {
          extension: {
            autoSave: autoSaveIsOn,
            device: {
              arch: os.arch(),
              hostname: os.hostname(),
              platform: os.platform(),
              macAddress: getMAC(),
              release: os.release(),
              shell: os.userInfo().shell,
              vendor: os.userInfo().username,
              vsAppHost: vsEnv.appHost,
              vsAppName: vsEnv.appName,
              vsAppSessionId: vsEnv.sessionId,
              vsMachineId: vsEnv.machineId,
              vsMetadata: vsEnv,
            },
            file: {
              content: fileContent,
              path: filePath,
            },
            git: {
              branch: gitCtx.branch,
              commit: gitCtx.commit,
              repository: gitCtx.repository,
            },
            session: {
              maskedOutput: maskedSessionOutput,
              plainOutput: plainSessionOutput,
            },
          },
          notebook: {
            cells: [
              {
                ...cell,
                outputs: cell.outputs.map((output) => ({
                  ...output,
                  items: output.items.filter((item) => {
                    if (item.mime === 'application/vnd.code.notebook.stdout') {
                      return item
                    }
                  }),
                })),
              },
            ],
            frontmatter: notebook?.frontmatter as ReporterFrontmatterInput,
            metadata: notebook?.metadata,
          },
        },
      },
    })

    log.info('Cell execution saved')

    const showEscalationButton = !!result.data?.createExtensionCellOutput?.isSlackReady
    log.info(`showEscalationButton: ${showEscalationButton ? 'enabled' : 'disabled'}`)

    TelemetryReporter.sendTelemetryEvent('app.save')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: result,
      id: message.output.id,
      escalationButton: showEscalationButton,
    })
  } catch (error) {
    log.error('Error saving cell execution', (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      escalationButton,
      hasErrors: true,
    })
  }
}
