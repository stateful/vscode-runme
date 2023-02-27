// eslint-disable-next-line max-len
import { ParserServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb.client'
// eslint-disable-next-line max-len
import { RunnerServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb.client'
import { ChannelCredentials } from '@grpc/grpc-js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

import { SERVER_ADDRESS } from '../../constants'
import { getPortNumber } from '../../utils/configuration'

function initParserClient(): ParserServiceClient {
  const transport = new GrpcTransport({
    host: `${SERVER_ADDRESS}:${getPortNumber()}`,
    channelCredentials: ChannelCredentials.createInsecure(),
  })

  return new ParserServiceClient(transport)
}

export { ParserServiceClient, RunnerServiceClient, initParserClient }
