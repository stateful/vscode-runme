import os from 'node:os'

import { Uri, env, workspace, commands } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import getMAC from 'getmac'
import YAML from 'yaml'
import { FetchResult } from '@apollo/client'

import { ClientMessages, NOTEBOOK_AUTOSAVE_ON, RUNME_FRONTMATTER_PARSED } from '../../../constants'
import { ClientMessage, FeatureName, IApiMessage } from '../../../types'
import { postClientMessage } from '../../../utils/messaging'
import ContextState from '../../contextState'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'
import { getAnnotations, getCellRunmeId, getGitContext, getPlatformAuthSession } from '../../utils'
import { GrpcSerializer } from '../../serializer'
import { InitializeClient } from '../../api/client'
import {
  CreateCellExecutionDocument,
  CreateCellExecutionMutation,
  CreateExtensionCellOutputDocument,
  CreateExtensionCellOutputMutation,
  CreateNotebookInput,
  ReporterFrontmatterInput,
} from '../../__generated-platform__/graphql'
import { Frontmatter } from '../../grpc/serializerTypes'
import { getCellById } from '../../cell'
export type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('SaveCell')

export default async function saveCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const isReporterEnabled = kernel.hasExperimentEnabled('reporter')
  const { messaging, message, editor } = requestMessage

  try {
    const autoSaveIsOn = ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON)
    const forceLogin = kernel.isFeatureOn(FeatureName.ForceLogin)
    const silent = forceLogin ? undefined : true
    const createIfNone = !message.output.data.isUserAction && autoSaveIsOn ? false : true

    const session = await getPlatformAuthSession(createIfNone && forceLogin, silent)
    if (!session) {
      await commands.executeCommand('runme.openCloudPanel')
      return postClientMessage(messaging, ClientMessages.platformApiResponse, {
        data: {
          displayShare: false,
        },
        id: message.output.id,
      })
    }

    const graphClient = InitializeClient({ runmeToken: session?.accessToken! })

    const path = editor.notebook.uri.fsPath
    const gitCtx = await getGitContext(path)
    const filePath = gitCtx.repository ? `${gitCtx.relativePath}${path?.split('/').pop()}` : path
    const fileContent = path ? await workspace.fs.readFile(Uri.file(path)) : undefined
    let data:
      | FetchResult<CreateExtensionCellOutputMutation>
      | FetchResult<CreateCellExecutionMutation>

    if (!session) {
      return postClientMessage(messaging, ClientMessages.platformApiResponse, {
        data: {
          displayShare: false,
        },
        id: message.output.id,
      })
    }

    // Save the file to ensure the serialization completes before saving the cell execution.
    // This guarantees we access the latest cache state of the serializer.
    await editor.notebook.save()

    log.info('Saving cell execution')

    const frontmatter = GrpcSerializer.marshalFrontmatter(editor.notebook.metadata, kernel)

    const metadata = {
      ...editor.notebook.metadata,
      [RUNME_FRONTMATTER_PARSED]: frontmatter,
    }

    const cacheId = GrpcSerializer.getDocumentCacheId(metadata) as string
    const plainSessionOutput = await kernel.getPlainCache(cacheId)
    const maskedSessionOutput = await kernel.getMaskedCache(cacheId)

    let hostname = os.hostname()
    if (['localhost', '127.0.0.1'].includes(hostname) && process.env.K_SERVICE) {
      hostname = process.env.K_SERVICE
    }

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

    // If the reporter is enabled, we will save the cell execution using the reporter API.
    // This is only temporary, until the reporter is fully tested.
    if (isReporterEnabled) {
      const notebookData = kernel.getNotebookDataCache(cacheId)

      if (!notebookData) {
        throw new Error(`Notebook data cache not found for cache ID: ${cacheId}`)
      }

      const notebook = GrpcSerializer.marshalNotebook(notebookData, {
        kernel,
        marshalFrontmatter: true,
      })

      const cell = notebook?.cells.find((c) => c.metadata.id === message.output.id)

      if (!cell) {
        throw new Error(`Cell not found in notebook ${notebook.frontmatter?.runme?.id}`)
      }

      // TODO: Implement the reporter to normalize the data into a valid Platform api payload
      const mutation = {
        mutation: CreateExtensionCellOutputDocument,
        variables: {
          input: {
            extension: {
              autoSave: autoSaveIsOn,
              device: {
                arch: os.arch(),
                hostname: hostname,
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
                  outputs: (cell?.outputs || [])?.map((output) => ({
                    ...output,
                    items: (output?.items || [])?.filter((item) => {
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
      }
      const result = await graphClient.mutate(mutation)
      data = result
    }
    // TODO: Remove the legacy createCellExecution mutation once the reporter is fully tested.
    else {
      const cell = await getCellById({ editor, id: message.output.id })
      if (!cell) {
        throw new Error('Cell not found')
      }

      const runmeId = getCellRunmeId(cell)
      const terminal = kernel.getTerminal(runmeId)
      if (!terminal) {
        throw new Error('Could not find an associated terminal')
      }
      const pid = (await terminal.processId) || 0
      const runnerExitStatus = terminal.runnerSession?.hasExited()
      const exitCode =
        runnerExitStatus?.type === 'exit'
          ? runnerExitStatus.code
          : runnerExitStatus?.type === 'error'
            ? 1
            : 0
      const annotations = getAnnotations(cell)
      delete annotations['runme.dev/id']

      const terminalContents = Array.from(new TextEncoder().encode(message.output.data.stdout))

      let fmParsed = editor.notebook.metadata[RUNME_FRONTMATTER_PARSED] as Frontmatter

      if (!fmParsed) {
        try {
          const yamlDocs = YAML.parseAllDocuments(editor.notebook.metadata['runme.dev/frontmatter'])
          fmParsed = yamlDocs[0].toJS?.() || {}
        } catch (error: any) {
          log.warn('failed to parse frontmatter, reason: ', error.message)
        }
      }

      let notebookInput: CreateNotebookInput | undefined

      if (fmParsed?.runme?.id || fmParsed?.runme?.version) {
        notebookInput = {
          fileName: path,
          id: fmParsed?.runme?.id,
          runmeVersion: fmParsed?.runme?.version,
        }
      }
      const sessionId = kernel.getRunnerEnvironment()?.getSessionId()

      const result = await graphClient.mutate({
        mutation: CreateCellExecutionDocument,
        variables: {
          input: {
            stdout: terminalContents,
            stderr: Array.from([]), // stderr will become applicable for non-terminal
            exitCode,
            pid,
            input: encodeURIComponent(cell.document.getText()),
            languageId: cell.document.languageId,
            autoSave: ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON),
            metadata: {
              mimeType: annotations.mimeType,
              name: annotations.name,
              category: annotations.category || '',
              exitType: runnerExitStatus?.type,
              startTime: cell.executionSummary?.timing?.startTime,
              endTime: cell.executionSummary?.timing?.endTime,
            },
            id: annotations.id,
            notebook: notebookInput,
            branch: gitCtx?.branch,
            repository: gitCtx?.repository,
            commit: gitCtx?.commit,
            fileContent,
            filePath,
            sessionId,
            plainSessionOutput,
            maskedSessionOutput,
            device: {
              macAddress: getMAC(),
              hostname: hostname,
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
            },
          },
        },
      })

      data = result
    }

    log.info('Cell execution saved')

    TelemetryReporter.sendTelemetryEvent('app.save')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data,
      id: message.output.id,
    })
  } catch (error) {
    log.error('Error saving cell execution', (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      hasErrors: true,
    })
  }
}
