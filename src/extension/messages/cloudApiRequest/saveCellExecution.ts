import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages, NOTEBOOK_AUTOSAVE_ON } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { postClientMessage } from '../../../utils/messaging'
import { CreateCellExecutionDocument, NotebookInput } from '../../__generated__/graphql'
import { InitializeClient } from '../../api/client'
import { getCellById } from '../../cell'
import ContextState from '../../contextState'
import { Frontmatter } from '../../grpc/serializerTypes'
import { Kernel } from '../../kernel'
import { RunmeService } from '../../services/runme'
import { getAnnotations, getAuthSession, getCellRunmeId } from '../../utils'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.cloudApiRequest>>

export default async function saveCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  try {
    const autoSaveIsOn = ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON)
    const session = await getAuthSession(
      !message.output.data.isUserAction && autoSaveIsOn ? false : true,
    )
    if (!session) {
      return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
        data: {
          displayShare: false,
        },
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
    const runmeService = new RunmeService({ githubAccessToken: session.accessToken })
    const runmeTokenResponse = await runmeService.getUserToken()
    if (!runmeTokenResponse) {
      throw new Error('Unable to retrieve an access token')
    }
    const graphClient = InitializeClient({ runmeToken: runmeTokenResponse.token })
    const terminalContents = Array.from(new TextEncoder().encode(message.output.data.stdout))

    const fmParsed = editor.notebook.metadata['runme.dev/frontmatterParsed'] as Frontmatter

    let notebookInput: NotebookInput | undefined

    if (fmParsed?.runme?.id || fmParsed?.runme?.version) {
      notebookInput = {
        id: fmParsed?.runme?.id,
        runmeVersion: fmParsed?.runme?.version,
      }
    }

    const result = await graphClient.mutate({
      mutation: CreateCellExecutionDocument,
      variables: {
        data: {
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
        },
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.save')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      id: message.output.id,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.error')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      hasErrors: true,
    })
  }
}
