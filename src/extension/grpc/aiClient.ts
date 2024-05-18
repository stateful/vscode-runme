import { AIServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js' // Import the missing module
import * as vscode from 'vscode'

import getLogger from '../logger'

const log = getLogger('AIClient')

// TODO(jeremy): Should we take transport as an argument?
export function initAIServiceClient(address: string): AIServiceClient {
  //const config = vscode.workspace.getConfiguration(extName)
  // Include a default so that address is always well defined
  //const address = config.get<string>('foyleAddress', 'localhost:9080')

  log.info(`Connecting to Foyle GRPC: ${address}`)
  const transport = new GrpcTransport({
    host: address,
    channelCredentials: ChannelCredentials.createInsecure(),
  })
  return new AIServiceClient(transport)
}
