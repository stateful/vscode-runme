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

const [typeDelay, switchDelay] = [100, 1000]
type EventsData = [string, number][]
const eventsData: EventsData = [
  ['h', typeDelay],
  ['he', typeDelay],
  ['hel', typeDelay],
  ['hell', typeDelay],
  ['hello', switchDelay],
  ['stop', switchDelay],
  ['how are you?', switchDelay],
  ['stop', switchDelay],
  ["Is it me you're looking for?", switchDelay],
  ['stop', switchDelay],
  ['here we go', switchDelay],
  ['again', switchDelay],
  ['down the only road I have ever known', switchDelay],
  ['done', switchDelay],
]

function scheduleEvents(creator: stream.StreamCreator) {
  // We need to delay each successive data point by 0.2 seconds to simulate typing
  function createCallback(value: string, index: number, delay: number): () => Promise<void> {
    return async () => {
      let event = new stream.CellChangeEvent(
        value,
        index,
        agent_pb.StreamGenerateRequest_Trigger.CELL_TEXT_CHANGE,
      )
      await creator.handleEvent(event)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Avoid overlapping runs by chaining the promises
  eventsData
    .map(([value, delay], i) => createCallback(value, i, delay))
    .reduce((p, fn) => p.then(fn), Promise.resolve())
}

class FakeCompletion implements stream.CompletionHandlers {
  contextId = ''
  data: string[] = []
  // Done is a promise which we use to signal to the test that we are done
  public done: Promise<void>
  resolveDone: () => void
  constructor(data) {
    this.data = data
    this.done = new Promise<void>((resolve, _reject) => {
      this.resolveDone = resolve
    })
  }

  async buildRequest(
    cellChangeEvent: stream.CellChangeEvent,
    { firstRequest, handleNewCells }: { firstRequest: boolean; handleNewCells: boolean },
  ): Promise<agent_pb.StreamGenerateRequest | null> {
    console.log('Building request:', cellChangeEvent, firstRequest)

    // Decide that we need a new request
    if (handleNewCells && this.contextId === '') {
      firstRequest = true
    }

    const data = this.data[cellChangeEvent.cellIndex]

    let req: agent_pb.StreamGenerateRequest
    if (firstRequest && handleNewCells) {
      this.contextId = ulid()
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
    } else {
      req = new agent_pb.StreamGenerateRequest({
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
    }

    if (handleNewCells && cellChangeEvent.notebookUri.includes('stop')) {
      firstRequest = true
    }

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
    const completion = new FakeCompletion(eventsData.map(([value]) => value))
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
