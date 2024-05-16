import { AIServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js' // Import the missing module

// TODO(jeremy): Should we take transport as an argument?
export function initAIServiceClient(): AIServiceClient {
  const transport = new GrpcTransport({
    host: 'localhost:9080',
    channelCredentials: ChannelCredentials.createInsecure(),
  })
  return new AIServiceClient(transport)
}
