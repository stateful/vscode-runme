import { TelemetryReporter } from 'vscode-telemetry'
import { AuthenticationSession, window } from 'vscode'

import {
  ClientMessages,
  NOTEBOOK_AUTOSAVE_ON,
  SAVE_CELL_LOGIN_CONSENT_STORAGE_KEY,
} from '../../../constants'
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

/**
 * Handles the first time experience for saving a cell.
 * It informs the user that a Login with a GitHub account is required before prompting the user.
 * This only happens once. Subsequent saves will not display the prompt.
 * @returns AuthenticationSession
 */
async function getSession(): Promise<AuthenticationSession | undefined> {
  let session = await getAuthSession(false)
  const displayLoginPrompt = ContextState.getKey(SAVE_CELL_LOGIN_CONSENT_STORAGE_KEY)
  if (!session && displayLoginPrompt !== false) {
    const option = await window.showInformationMessage(
      `You are about to securely store your cell output on the Runme Cloud.
      authenticating with GitHub is required, do you want to proceed?`,
      'Yes',
      'Dismiss',
    )
    if (!option || option === 'Dismiss') {
      throw new Error('Failed to save cell output, authenticating with GitHub denied')
    }

    session = await getAuthSession(true)
    if (!session) {
      throw new Error('You must authenticate with your GitHub account')
    } else {
      await ContextState.addKey(SAVE_CELL_LOGIN_CONSENT_STORAGE_KEY, false)
    }
  } else {
    session = await getAuthSession(true)
  }

  return session
}

export default async function saveCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  try {
    const session = await getSession()
    if (!session) {
      throw new Error('You must authenticate with your GitHub account')
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
