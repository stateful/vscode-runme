import { PromiseClient } from '@connectrpc/connect'
import { AIService } from '@buf/jlewi_foyle.connectrpc_es/foyle/v1alpha1/agent_connect'
import {
  LogEventsRequest,
  LogEventType,
  LogEvent,
} from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'
import * as vscode from 'vscode'

import { RUNME_CELL_ID } from '../constants'
import getLogger from '../logger'

import * as converters from './converters'

// Interface for the event reporter
// This allows us to swap in a null op logger when AI isn't enabled
export interface IEventReporter {
  reportExecution(cell: vscode.NotebookCell): Promise<void>
}

// EventReporter handles reporting events to the AI service
export class EventReporter implements IEventReporter {
  client: PromiseClient<typeof AIService>
  log: ReturnType<typeof getLogger>

  constructor(client: PromiseClient<typeof AIService>) {
    this.client = client
    this.log = getLogger('AIEventReporter')
  }

  async reportExecution(cell: vscode.NotebookCell) {
    const req = new LogEventsRequest()

    const contextCells: vscode.NotebookCell[] = []

    // Include the two previous cells as context.
    // TODO(jeremy): Should we make this variable? Set some budget based on length?
    let startIndex = cell.index - 2
    if (startIndex < 0) {
      startIndex = 0
    }
    for (let i = startIndex; i < cell.index; i++) {
      contextCells.push(cell.notebook.cellAt(i))
    }

    contextCells.push(cell)

    const cells = converters.vsCellsToESProtos(contextCells)
    const event = new LogEvent()
    event.selectedId = cell.metadata?.[RUNME_CELL_ID]
    event.type = LogEventType.EXECUTE
    event.cells = cells
    req.events = [event]

    await this.client.logEvents(req).catch((e) => {
      this.log.error(`Failed to log event; error: ${e}`)
    })
  }
}

// NullOpEventReporter is a null op implementation of the event reporter
export class NullOpEventReporter implements IEventReporter {
  async reportExecution(_cell: vscode.NotebookCell) {
    // Do nothing
  }
}

var _globalReporter = new NullOpEventReporter()

// getEventReporter returns the global event reporter
export function getEventReporter(): IEventReporter {
  return _globalReporter
}

export function setEventReporter(reporter: IEventReporter) {
  _globalReporter = reporter
}
