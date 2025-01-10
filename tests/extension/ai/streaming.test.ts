import { test } from 'vitest'
import { vi } from 'vitest'
import * as agent_pb from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'
import * as parser_pb from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'
import { ulid } from 'ulidx'
import { AIService } from '@buf/jlewi_foyle.connectrpc_es/foyle/v1alpha1/agent_connect'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'

import getLogger from '../../../src/extension/logger'
import * as stream from '../../../src/extension/ai/stream'

const log = getLogger()

vi.mock('vscode', async () => {
  const vscode = await import('../../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})

const eventsData = [
  'hello',
  'how are you?',
  'stop',
  "Is it me you're looking for?",
  'stop',
  'here we go',
  'again',
  'down the only road I have ever known',
  'done',
]

function scheduleEvents(creator: stream.StreamCreator) {
  // We need to delay each successive data point by 1 seconds to simulate typing
  // The timeouts are asynchronous which is why we need to increase the timeout for each item
  function createCallback(index: number, value: string): () => Promise<void> {
    return async () => {
      let event = new stream.CellChangeEvent(
        value,
        index,
        agent_pb.StreamGenerateRequest_Trigger.CELL_TEXT_CHANGE,
      )
      await creator.handleEvent(event)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // Avoid overlapping runs by chaining the promises
  eventsData
    .map((value, index) => createCallback(index, value))
    .reduce((p, fn) => p.then(fn), Promise.resolve())
}

class FakeCompletion implements stream.CompletionHandlers {
  contextId = ulid()
  data: string[] = []
  // Done is a promise which we use to signal to the test that we are done
  public done: Promise<void>
  resolveDone: () => void
  constructor(data: string[]) {
    this.data = data
    this.done = new Promise<void>((resolve, _reject) => {
      this.resolveDone = resolve
    })
  }

  async buildRequest(
    cellChangeEvent: stream.CellChangeEvent,
    firstRequest: boolean,
  ): Promise<agent_pb.StreamGenerateRequest | null> {
    console.log('Building request:', cellChangeEvent, firstRequest)

    // Decide that we need a new request
    if (cellChangeEvent.notebookUri.includes('stop')) {
      this.contextId = ulid()
      firstRequest = true
    }

    const data = this.data[cellChangeEvent.cellIndex]

    if (firstRequest) {
      let req = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'fullContext',
          value: new agent_pb.FullContext({
            notebook: new parser_pb.Notebook({
              cells: [
                new parser_pb.Cell({
                  value: data,
                  languageId: 'markdown',
                  kind: parser_pb.CellKind.MARKUP,
                }),
              ],
            }),
            selected: 0,
            notebookUri: cellChangeEvent.notebookUri,
          }),
        },
        contextId: this.contextId,
        trigger: agent_pb.StreamGenerateRequest_Trigger.CELL_TEXT_CHANGE,
      })
      return req
    }

    let req = new agent_pb.StreamGenerateRequest({
      request: {
        case: 'update',
        value: new agent_pb.UpdateContext({
          cell: new parser_pb.Cell({
            value: data,
            languageId: 'markdown',
            kind: parser_pb.CellKind.MARKUP,
          }),
        }),
      },
      contextId: this.contextId,
      trigger: agent_pb.StreamGenerateRequest_Trigger.CELL_TEXT_CHANGE,
    })
    return req
  }

  processResponse(response: agent_pb.StreamGenerateResponse): void {
    // Stub implementation
    console.log('Processing response:', response)
    response.cells.forEach((cell) => {
      if (cell.value.includes('done')) {
        log.info('Stopping')
        this.shutdown()
      }
    })
  }

  shutdown = (): void => {
    this.resolveDone()
  }
}

test.skipIf(process.env.RUN_MANUAL_TESTS !== 'true')(
  'manual foyle streaming RPC test',
  async () => {
    const completion = new FakeCompletion(eventsData)
    const client = createClient(
      AIService,
      createConnectTransport({
        httpVersion: '2',
        baseUrl: 'http://localhost:8877/api',
      }),
    )
    const creator = new stream.StreamCreator(completion, client)

    scheduleEvents(creator)
    await completion.done
  },
  // Increase the test timeout
  60000,
)
