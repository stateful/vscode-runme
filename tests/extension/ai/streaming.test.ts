import { test } from 'vitest'
import { vi } from 'vitest'

import getLogger from '../../../src/extension/logger'
import * as stream from '../../../src/extension/ai/stream'
import * as agent_pb from '../../../src/extension/ai/foyle/v1alpha1/agent_pb'
import * as doc_pb from '../../../src/extension/ai/foyle/v1alpha1/doc_pb'
import {
  Observable,
  lastValueFrom,
  Subscriber,
  from,
  Subject,
  windowCount,
  map,
  mergeAll,
  EmptyError,
  tap,
  finalize,
} from 'rxjs'

import {
  StreamGenerateRequest,
  FullContext,
  BlockUpdate,
  StreamGenerateResponse,
} from './foyle/v1alpha1/agent_pb'

const log = getLogger()

vi.mock('vscode', async () => {
  const vscode = await import('../../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})

function fireEvents(creator: stream.StreamCreator) {
  const data = [
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

  // We need to create a generator to bind the index and value to the callback
  function createCallback(index: number, value: string): () => void {
    return () => {
      let event = new stream.CellChangeEvent(value, index)
      creator.handleEvent(event)
    }
  }

  for (let i = 0; i < data.length; i++) {
    // We need to delay each successive data point by 2 seconds to simulate typing
    // The timeouts are asynchronous which is why we need to increase the timeout for each item
    let f = createCallback(i, data[i])
    setTimeout(f, 1000 * i)
  }
}

class FakeCompletion implements stream.CompletionHandlers {
  // Done is a promise which we use to signal to the test that we are done
  public done: Promise<void>
  resolveDone: () => void
  constructor() {
    this.done = new Promise<void>((resolve, reject) => {
      this.resolveDone = resolve
    })
  }

  buildRequest(
    cellChangeEvent: stream.CellChangeEvent,
    firstRequest: boolean,
  ): StreamGenerateRequest {
    console.log('Building request:', cellChangeEvent, firstRequest)

    // Decide that we need a new rewuest
    if (cellChangeEvent.notebookUri.includes('stop')) {
      firstRequest = true
    }

    if (firstRequest) {
      let doc = new doc_pb.Doc({
        blocks: [
          new doc_pb.Block({
            kind: doc_pb.BlockKind.MARKUP,
            contents: cellChangeEvent.notebookUri,
          }),
        ],
      })
      let req = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'fullContext',
          value: new agent_pb.FullContext({
            doc: doc,
            selected: cellChangeEvent.cellIndex,
            notebookUri: cellChangeEvent.notebookUri,
          }),
        },
      })
      return req
    }

    let req = new agent_pb.StreamGenerateRequest({
      request: {
        case: 'update',
        value: new agent_pb.BlockUpdate({
          blockId: 'block-1',
          blockContent: cellChangeEvent.notebookUri,
        }),
      },
    })
    return req
  }

  processResponse(response: StreamGenerateResponse): void {
    // Stub implementation
    console.log('Processing response:', response)
    response.blocks.forEach((cell) => {
      if (cell.contents.includes('done')) {
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
    let completion = new FakeCompletion()
    let creator = new stream.StreamCreator(completion)

    fireEvents(creator)
    await completion.done
  },
  // Increase the test timeout
  60000,
)
