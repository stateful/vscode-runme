import { createPromiseClient, Transport } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-node'
import { AIService } from './foyle/v1alpha1/agent_connect'
import { StreamGenerateRequest, FullContext, BlockUpdate } from './foyle/v1alpha1/agent_pb'
import { Doc } from './foyle/v1alpha1/doc_pb'
import * as http2 from 'http2'
import { Observable, fromEventPattern } from 'rxjs'

const baseUrl = 'http://localhost:8080/api'

// Create a client
const client = createPromiseClient(AIService, createDefaultTransport())

// So we create an iterator that will generate some responses and then exit
class Iterator {
  count = 0
  // next(value?: any): Promise<IteratorResult<string>> {
  next(value?: string): Promise<IteratorResult<StreamGenerateRequest>> {
    const updates = ['hello', 'how are you?', "Is it me you're looking for?"]
    if (this.count < updates.length) {
      var msg = updates[this.count]
      msg += ` input: ${value}`
      const blockUpdate = new StreamGenerateRequest({
        request: {
          case: 'update',
          value: new BlockUpdate({
            blockId: `block-${this.count}`,
            blockContent: msg,
          }),
        },
      })
      this.count++
      return Promise.resolve({ done: false, value: blockUpdate })
    }
    return Promise.resolve({ done: true, value: 'The end.' })
  }

  // TODO(jeremy): When is return invoked?
  return?(value?: any): Promise<IteratorResult<StreamGenerateRequest>> {
    return Promise.resolve({ done: true, value: value })
  }

  // TODO(jeremy): When is throw invoked?
  throw?(e?: any): Promise<IteratorResult<StreamGenerateRequest>> {
    return Promise.reject(e)
  }
}

// Completion Generator implements the AsyncIterable interface and is used to generate requests.
class CompletionGenerator implements AsyncIterable<StreamGenerateRequest> {
  [Symbol.asyncIterator](): AsyncIterator<StreamGenerateRequest> {
    return new Iterator()
  }
}

function createDefaultTransport(): Transport {
  return createConnectTransport({
    // Copied from https://github.com/connectrpc/examples-es/blob/656f27bbbfb218f1a6dce2c38d39f790859298f1/vanilla-node/client.ts#L25
    // Do we need to use http2?
    httpVersion: '2',
    // baseUrl needs to include the path prefix.
    baseUrl: baseUrl,
    nodeOptions: {
      // Create a custom HTTP/2 client
      createClient: (authority) => {
        return http2.connect(authority, {
          // Allow insecure HTTP connections
          rejectUnauthorized: false,
        })
      },
    },
  })
}

// Requests are created asynchronously by an async generator function.
//
// TODO(jeremy): To wire this up to vscode, I think the generator would be created
// in response to user input events; e.g. key press that would trigger a completion request.
// I'm not quite sure how
// firstRequest = "hello"
// async function* generateNumbers(firstRequest): AsyncIterable<StreamGenerateRequest> {
//   //const updates = ['hello', 'how are you?', "Is it me you're looking for?"]
//   // Send block updates
//   for (const [index, update] of updates.entries()) {
//     const blockUpdate = new StreamGenerateRequest({
//       request: {
//         case: 'update',
//         value: new BlockUpdate({
//           blockId: `block-${index}`,
//           blockContent: update,
//         }),
//       },
//     })
//     yield await blockUpdate
//   }
// }

// function main() {
//   generator = generateNumbers('hello')

//   //generator.next("how are you")
// }

// Create an exampleProgram
export async function exampleProgram() {
  // Create an observable from the handler
  const observable = fromEventPattern<string>(
    (handler) => {
      // This is where we would subscribe to the event
      // In this example, we're just calling the handler directly
      handler('Hello World!')
    },
    (handler) => {
      // This is where we would unsubscribe from the event
      // In this example, we don't need to do anything
    },
  )
}

export async function callStreamGenerate() {
  try {
    // Start the bidirectional stream
    const responseIterable = client.streamGenerate(new CompletionGenerator())

    // Await all responses
    console.log('Waiting for responses...')
    for await (const response of responseIterable) {
      console.log('Block Recieved:', response)
    }

    console.log('Stream closeds...')
    // The stream will automatically close after all responses are received

    //return responses
  } catch (error) {
    console.error('Error in StreamGenerate:', error)
    throw error
  }
}

// Helper function to simulate getting user input (replace with actual implementation)
// async function getUserInput(): Promise<string> {
//   return new Promise((resolve) => {
//     // This is a placeholder. In a real application, you'd get input from the user.
//     setTimeout(() => resolve('Some user input'), 1000)
//   })
// }

export async function callSimpleMethod() {
  // Create a FullContext message
  const fullContext = new FullContext({
    doc: new Doc({
      // Fill in the necessary fields for the Doc message
      // For example:
      // id: "example-doc",
      // blocks: [...],
    }),
    selected: 0,
  })

  // Create a StreamGenerateRequest message
  const request = new StreamGenerateRequest({
    request: {
      case: 'fullContext',
      value: fullContext,
    },
  })

  try {
    // Call the Simple method
    const response = await client.simple(request)
    console.log('Response received simple method:', response)

    // Process the response
    if (response.blocks) {
      response.blocks.forEach((block, index) => {
        console.log(`Block ${index + 1}:`, block)
      })
    } else {
      console.log('No blocks in the response.')
    }
  } catch (error) {
    console.error('Error calling Simple method:', error)
  }
}
