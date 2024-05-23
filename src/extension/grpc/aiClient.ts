import { AIServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js' // Import the missing module

import getLogger from '../logger'

const log = getLogger('AIClient')

// TODO(jeremy): Should we take transport as an argument?
export function initAIServiceClient(address: string): AIServiceClient {
  log.info(`Connecting to Foyle GRPC: ${address}`)
  const transport = new GrpcTransport({
    host: address,
    channelCredentials: ChannelCredentials.createInsecure(),
  })
  return new AIServiceClient(transport)
}
