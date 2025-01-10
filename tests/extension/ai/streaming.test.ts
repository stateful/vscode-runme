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

let contextId = ulid()
const eventsData = [
  'hello',
  'how are you?',
  'stop',
  "Is it me you're looking for?",
  // 'stop',
  // 'here we go',
  // 'again',
  // 'down the only road I have ever known',
  'done',
]

function fireEvents(creator: stream.StreamCreator) {
  // We need to create a generator to bind the index and value to the callback
  function createCallback(index: number, value: string): () => void {
    return () => {
      let event = new stream.CellChangeEvent(
        value,
        index,
        agent_pb.StreamGenerateRequest_Trigger.CELL_TEXT_CHANGE,
      )
      creator.handleEvent(event)
    }
  }

  for (let i = 0; i < eventsData.length; i++) {
    // We need to delay each successive data point by 2 seconds to simulate typing
    // The timeouts are asynchronous which is why we need to increase the timeout for each item
    let f = createCallback(i, eventsData[i])
    setTimeout(f, 1000 * i)
  }
}

class FakeCompletion implements stream.CompletionHandlers {
  // Done is a promise which we use to signal to the test that we are done
  public done: Promise<void>
  resolveDone: () => void
  constructor() {
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
      contextId = ulid()
      firstRequest = true
    }

    const data = eventsData[cellChangeEvent.cellIndex]

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
        contextId,
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
      contextId,
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
    const completion = new FakeCompletion()
    const client = createClient(
      AIService,
      createConnectTransport({
        httpVersion: '2',
        baseUrl: 'http://localhost:8877/api',
      }),
    )
    const creator = new stream.StreamCreator(completion, client)

    fireEvents(creator)
    await completion.done
  },
  60000,
) // Increase the test timeout
