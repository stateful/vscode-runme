import { PromiseClient } from '@connectrpc/connect'
import { AIService } from '@buf/jlewi_foyle.connectrpc_es/foyle/v1alpha1/agent_connect'
import {
  LogEventRequest,
  LogEventsResponse,
} from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'

import * as vscode from 'vscode'

// Interface for the event reporter
// This allows us to swap in a null op logger when AI isn't enabled
export interface IEventReporter {
  reportExecution(cell: vscode.NotebookCell): void
}

// EventReporter handles reporting events to the AI service
class EventReporter {
  client: PromiseClient<typeof AIService>

  constructor(client: PromiseClient<typeof AIService>) {
    this.client = client
  }

  async reportExecution(cell: vscode.NotebookCell) {
    const req = new GenerateCellsRequest()
    req.notebook = protos.notebookTSToES(notebookProto)
    await this.client.generateCells(req)
  }
}
