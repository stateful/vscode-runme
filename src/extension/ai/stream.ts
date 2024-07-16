import { createPromiseClient, Transport } from '@bufbuild/connect'

import { createConnectTransport } from '@bufbuild/connect-node'
import { AIService } from './foyle/v1alpha1/agent_connect'
import { StreamGenerateRequest, FullContext, BlockUpdate } from './foyle/v1alpha1/agent_pb'
import { Doc } from './foyle/v1alpha1/doc_pb'
import * as http2 from 'http2'

const baseUrl = 'http://localhost:8080/api'

// Create a client
const client = createPromiseClient(AIService, createDefaultTransport())

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
async function* generateNumbers(): AsyncIterable<StreamGenerateRequest> {
  const updates = ['hello', 'how are you?', "Is it me you're looking for?"]
  // Send block updates
  for (const [index, update] of updates.entries()) {
    const blockUpdate = new StreamGenerateRequest({
      request: {
        case: 'update',
        value: new BlockUpdate({
          blockId: `block-${index}`,
          blockContent: update,
        }),
      },
    })
    yield await blockUpdate
  }
}

export async function callStreamGenerate() {
  // Create an initial FullContext message
  // const fullContext = new FullContext({
  //   doc: new Doc({
  //     // Fill in the necessary fields for the Doc message
  //     id: 'example-doc',
  //     // other fields as needed
  //   }),
  //   selected: 0,
  // })

  // Create an initial StreamGenerateRequest message
  // const initialRequest = new StreamGenerateRequest({
  //   request: {
  //     case: 'fullContext',
  //     value: fullContext,
  //   },
  // })

  // const updates = ['hello', 'how are you?', "Is it me you're looking for?"]
  // const responses: StreamGenerateResponse[] = []

  try {
    // Start the bidirectional stream
    const responseIterable = client.streamGenerate(generateNumbers())

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
async function getUserInput(): Promise<string> {
  return new Promise((resolve) => {
    // This is a placeholder. In a real application, you'd get input from the user.
    setTimeout(() => resolve('Some user input'), 1000)
  })
}

// Call the function
//callStreamGenerate()

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

// Call the function
//callSimpleMethod()
