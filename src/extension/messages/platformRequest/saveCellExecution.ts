import os from 'node:os'

import { NotebookData, Uri, workspace } from 'vscode'
import { Uri, workspace, env } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import YAML from 'yaml'
import getMAC from 'getmac'

import { ClientMessages, NOTEBOOK_AUTOSAVE_ON } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { postClientMessage } from '../../../utils/messaging'
import {
  CreateCellExecutionDocument,
  CreateNotebookInput,
} from '../../__generated-platform__/graphql'
import { InitializeClient } from '../../api/client'
import { getCellById } from '../../cell'
import ContextState from '../../contextState'
import { Frontmatter } from '../../grpc/serializerTypes'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'
import { getAnnotations, getCellRunmeId, getGitContext, getPlatformAuthSession } from '../../utils'
import { GrpcSerializer } from '../../serializer'
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
    remoteName: env.remoteName,
    sessionId: env.sessionId,
    shell: env.shell,
    uiKind: env.uiKind,
    uriScheme: env.uriScheme,
  }

  const device = {
    macAddress: getMAC(),
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    vendor: os.cpus()[0].model,
    shell: vsEnv.shell,
    // Only save the relevant env variables
    vsAppHost: vsEnv.appHost,
    vsAppName: vsEnv.appName,
    vsAppSessionId: vsEnv.sessionId,
    vsMachineId: vsEnv.machineId,
    metadata: {
      // Let's save the entire env object for future reference if needed
      vsEnv,
    },
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
    // const payload = await kernel.getReporterPayload({
    //   notebook,
    //   autoSave: ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON),
    //   branch: gitCtx?.branch || undefined,
    //   commit: gitCtx?.commit || undefined,
    //   fileContent,
    //   filePath,
    //   maskedOutput: maskedSessionOutput,
    //   plainOutput: plainSessionOutput,
    //   repository: gitCtx?.repository || undefined,
    // })

    // console.log('payload', payload)

    // const c = rawCache?.cells.find(
    //   (c) => (c.metadata as Serializer.Metadata)?.id === message.output.id,
    // )

    // const payload = {
    //   ...rawCache,
    //   cells: [c],
    // }
    // console.log('payload', payload)

    // const result = await graphClient.mutate({
    //   mutation: CreateCellExecutionDocument,
    //   variables: {
    //     input: {
    //       stdout: terminalContents,
    //       stderr: Array.from([]), // stderr will become applicable for non-terminal
    //       exitCode,
    //       pid,
    //       input: encodeURIComponent(cell.document.getText()),
    //       languageId: cell.document.languageId,
    //       autoSave: ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON),
    //       metadata: {
    //         mimeType: annotations.mimeType,
    //         name: annotations.name,
    //         category: annotations.category || '',
    //         exitType: runnerExitStatus?.type,
    //         startTime: cell.executionSummary?.timing?.startTime,
    //         endTime: cell.executionSummary?.timing?.endTime,
    //       },
    //       id: annotations.id,
    //       notebook: notebookInput,
    //       branch: gitCtx?.branch,
    //       repository: gitCtx?.repository,
    //       commit: gitCtx?.commit,
    //       fileContent,
    //       filePath,
    //       sessionId,
    //       plainSessionOutput,
    //       maskedSessionOutput,
    //     },
    //   },
    // })
    log.info('Cell execution saved')

    const showEscalationButton = !!result.data?.createCellExecution?.isSlackReady
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
