import * as vscode from 'vscode'
import { createPromiseClient, PromiseClient, Transport } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'
import { AIService } from '@buf/jlewi_foyle.connectrpc_es/foyle/v1alpha1/agent_connect'

import getLogger from '../logger'

import * as ghost from './ghost'
import * as stream from './stream'
import * as generate from './generate'
import * as events from './events'
// AIManager is a class that manages the AI services.
export class AIManager {
  log: ReturnType<typeof getLogger>

  subscriptions: vscode.Disposable[] = []
  client: PromiseClient<typeof AIService>
  completionGenerator: generate.CompletionGenerator

  constructor() {
    this.log = getLogger('AIManager')
    this.log.info('AI: Initializing AI Manager')
    const config = vscode.workspace.getConfiguration('runme.experiments')
    const autoComplete = config.get<boolean>('aiAutoCell', false)
    this.client = this.createAIClient()
    this.completionGenerator = new generate.CompletionGenerator(this.client)
    if (autoComplete) {
      this.registerGhostCellEvents()
    }
  }

  // N.B. We use arrow notation to ensure this is bound to the AIManager instance.
  createAIClient = (): PromiseClient<typeof AIService> => {
    const config = vscode.workspace.getConfiguration('runme')
    const baseURL = config.get<string>('aiBaseURL', 'http://localhost:8877/api')
    this.log.info(`AI: Using AI service at: ${baseURL}`)
    return createPromiseClient(AIService, createDefaultTransport(baseURL))
  }

  // registerGhostCellEvents should be called when the extension is activated.
  // It registers event handlers to listen to when cells are added or removed
  // as well as when cells change. This is used to create ghost cells.
  registerGhostCellEvents() {
    this.log.info('AI: Enabling AutoCell Generation')
    let cellGenerator = new ghost.GhostCellGenerator()

    // Create a stream creator. The StreamCreator is a class that effectively windows events
    // and turns each window into an AsyncIterable of streaming requests.
    let creator = new stream.StreamCreator(cellGenerator, this.client)

    // Update the global event reporter to use the AI service
    events.setEventReporter(new events.EventReporter(this.client, creator))

    let eventGenerator = new ghost.CellChangeEventGenerator(creator)
    // onDidChangeTextDocument fires when the contents of a cell changes.
    // We use this to generate completions.
    // In my testing, onDidChangeTextDocument fires for the cell (scheme vscode-notebook-cell)
    // as well as for the output (scheme output). For output though it seemed to be firing continuously
    // so I didn't understand what was triggering it.
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(eventGenerator.handleOnDidChangeNotebookCell),
    )

    // onDidChangeVisibleTextEditors fires when the visible text editors change.
    // This can happen due to scrolling.
    // We need to trap this event to apply decorations to turn cells into ghost cells.
    this.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors(
        eventGenerator.handleOnDidChangeVisibleTextEditors,
      ),
    )

    // When a cell is selected we want to check if its a ghost cell and if so render it a non-ghost cell.
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(cellGenerator.handleOnDidChangeActiveTextEditor),
    )
  }

  // Cleanup method. We will use this to clean up any resources when extension is closed.
  dispose() {
    this.subscriptions.forEach((subscription) => subscription.dispose())
  }
}

function createDefaultTransport(baseURL: string): Transport {
  return createConnectTransport({
    // eslint-disable-next-line max-len
    // N.B unlike https://github.com/connectrpc/examples-es/blob/656f27bbbfb218f1a6dce2c38d39f790859298f1/vanilla-node/client.ts#L25
    // For some reason I didn't seem to have to allow unauthorized connections.
    // Do we need to use http2?
    httpVersion: '2',
    // baseUrl needs to include the path prefix.
    baseUrl: baseURL,
  })
}
