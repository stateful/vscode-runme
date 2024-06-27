import { Uri, window, workspace } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import YAML from 'yaml'

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
export type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('SaveCell')

export default async function saveCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage
  log.info('Saving cell execution')

  const escalationButton = kernel.hasExperimentEnabled('escalationButton', false)!
  log.info(`escalationButton: ${escalationButton ? 'enabled' : 'disabled'}`)

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
    const graphClient = InitializeClient({ runmeToken: session.accessToken })

    const terminalContents = Array.from(new TextEncoder().encode(message.output.data.stdout))

    let fmParsed = editor.notebook.metadata['runme.dev/frontmatterParsed'] as Frontmatter

    if (!fmParsed) {
      const yamlDocs = YAML.parseAllDocuments(editor.notebook.metadata['runme.dev/frontmatter'])
      fmParsed = yamlDocs[0].toJS()
    }

    let notebookInput: CreateNotebookInput | undefined

    const gitCtx = await getGitContext()
    const path = window.activeTextEditor?.document.uri.fsPath
    const filePath = gitCtx.repository ? `${gitCtx.relativePath}${path?.split('/').pop()}` : path
    const fileContent = path ? await workspace.fs.readFile(Uri.file(path)) : null

    if (fmParsed?.runme?.id || fmParsed?.runme?.version) {
      notebookInput = {
        fileName: path,
        id: fmParsed?.runme?.id,
        runmeVersion: fmParsed?.runme?.version,
      }
    }

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
        },
      },
    })
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
