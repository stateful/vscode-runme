import { RpcError } from '@protobuf-ts/runtime-rpc'
// eslint-disable-next-line max-len
import { ParserServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb.client'
// eslint-disable-next-line max-len
import {
  IRunnerServiceClient,
  RunnerServiceClient,
} from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb.client'
// eslint-disable-next-line max-len
import { ProjectServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/project/v1/project_pb.client'
import { HealthClient } from '@buf/grpc_grpc.community_timostamm-protobuf-ts/grpc/health/v1/health_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

function initParserClient(transport: GrpcTransport): ParserServiceClient {
  return new ParserServiceClient(transport)
}

function initProjectClient(transport: GrpcTransport): ProjectServiceClient {
  return new ProjectServiceClient(transport)
}

type ReadyPromise = Promise<void | Error>

export {
  ParserServiceClient,
  IRunnerServiceClient,
  RunnerServiceClient,
  ProjectServiceClient,
  initParserClient,
  initProjectClient,
  HealthClient,
  ReadyPromise,
  RpcError,
}
