import { PromiseClient } from '@connectrpc/connect'
import { AIService } from '@buf/jlewi_foyle.connectrpc_es/foyle/v1alpha1/agent_connect'
import {
  LogEventsRequest,
  LogEventType,
  LogEvent,
} from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'
import * as parser_pb from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'
import * as vscode from 'vscode'

import { RUNME_CELL_ID } from '../constants'

import * as converters from './converters'

// Interface for the event reporter
// This allows us to swap in a null op logger when AI isn't enabled
export interface IEventReporter {
  reportExecution(cell: vscode.NotebookCell): Promise<void>
}

// EventReporter handles reporting events to the AI service
export class EventReporter implements IEventReporter {
  client: PromiseClient<typeof AIService>

  constructor(client: PromiseClient<typeof AIService>) {
    this.client = client
  }

  async reportExecution(cell: vscode.NotebookCell) {
    const req = new LogEventsRequest()

    const cells: parser_pb.Cell[] = []
    cells.push(converters.vsCellToESProto(cell))
    const event = new LogEvent()
    event.selectedId = cell.metadata?.[RUNME_CELL_ID]
    event.type = LogEventType.EXECUTE
    event.cells = cells
    req.events = [event]

    await this.client.logEvents(req)
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
