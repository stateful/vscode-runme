import { RpcError } from '@protobuf-ts/runtime-rpc'
// eslint-disable-next-line max-len
import { ParserServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb.client'
// eslint-disable-next-line max-len
import { RunnerServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb.client'
import { HealthClient } from '@buf/grpc_grpc.community_timostamm-protobuf-ts/grpc/health/v1/health_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

function initParserClient(transport: GrpcTransport): ParserServiceClient {
  return new ParserServiceClient(transport)
}

export { ParserServiceClient, RunnerServiceClient, initParserClient, HealthClient, RpcError }
