import * as vscode from 'vscode'

import getLogger from '../logger'

import * as ghost from './ghost'
import * as stream from './stream'

// AIManager is a class that manages the AI services.
export class AIManager {
  log: ReturnType<typeof getLogger>

  subscriptions: vscode.Disposable[] = []

  constructor() {
    const config = vscode.workspace.getConfiguration('runme.experiments')
    const autoComplete = config.get<boolean>('aiAutoCell', false)

    this.log = getLogger('AIManager')
    if (autoComplete) {
      this.registerGhostCellEvents()
    }
  }

  // registerGhostCellEvents should be called when the extension is activated.
  // It registers event handlers to listen to when cells are added or removed
  // as well as when cells change. This is used to create ghost cells.
  registerGhostCellEvents() {
    const config = vscode.workspace.getConfiguration('runme')
    const baseUrl = config.get<string>('runme.aiBaseURL', 'http://localhost:8080/api')

    this.log.info('AI: Enabling AutoCell Generation')
    let cellGenerator = new ghost.GhostCellGenerator()

    // Create a stream creator. The StreamCreator is a class that effectively windows events
    // and turns each window into an AsyncIterable of streaming requests.
    let creator = new stream.StreamCreator(cellGenerator, baseUrl)

    let eventGenerator = new ghost.CellChangeEventGenerator(creator)
    // onDidChangeTextDocument fires when the contents of a cell changes.
    // We use this to generate completions.
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(eventGenerator.handleOnDidChangeNotebookCell),
    )

    // onDidChangeVisibleTextEditors fires when the visible text editors change.
    // We need to trap this event to apply decorations to turn cells into ghost cells.
    this.subscriptions.push(
      vscode.window.onDidChangeVisibleTextEditors(ghost.handleOnDidChangeVisibleTextEditors),
    )

    // When a cell is selected we want to check if its a ghost cell and if so render it a non-ghost cell.
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(ghost.handleOnDidChangeActiveTextEditor),
    )
  }

  // Cleanup method. We will use this to clean up any resources when extension is closed.
  dispose() {
    this.subscriptions.forEach((subscription) => subscription.dispose())
  }
}
