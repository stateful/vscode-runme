import {
  DuplexStreamingCall,
  RpcError,
  RpcOptions,
  ServerStreamingCall,
  UnaryCall,
} from '@protobuf-ts/runtime-rpc'
// eslint-disable-next-line max-len
import { ParserServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb.client'
// eslint-disable-next-line max-len
import { RunnerServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb.client'
// eslint-disable-next-line max-len
import { ProjectServiceClient } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/project/v1/project_pb.client'
import { HealthClient } from '@buf/grpc_grpc.community_timostamm-protobuf-ts/grpc/health/v1/health_pb.client'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

import {
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionRequest,
  GetSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  DeleteSessionRequest,
  DeleteSessionResponse,
  MonitorEnvStoreRequest,
  MonitorEnvStoreResponse,
  ResolveProgramRequest,
  ResolveProgramResponse,
  ExecuteRequest,
  ExecuteResponse,
} from './runner/types'

interface IRunnerServiceClient {
  createSession(
    input: CreateSessionRequest,
    options?: RpcOptions,
  ): UnaryCall<CreateSessionRequest, CreateSessionResponse>

  getSession(
    input: GetSessionRequest,
    options?: RpcOptions,
  ): UnaryCall<GetSessionRequest, GetSessionResponse>

  listSessions(
    input: ListSessionsRequest,
    options?: RpcOptions,
  ): UnaryCall<ListSessionsRequest, ListSessionsResponse>

  updateSession?(
    input: UpdateSessionRequest,
    options?: RpcOptions,
  ): UnaryCall<UpdateSessionRequest, UpdateSessionResponse>

  deleteSession(
    input: DeleteSessionRequest,
    options?: RpcOptions,
  ): UnaryCall<DeleteSessionRequest, DeleteSessionResponse>

  monitorEnvStore(
    input: MonitorEnvStoreRequest,
    options?: RpcOptions,
  ): ServerStreamingCall<MonitorEnvStoreRequest, MonitorEnvStoreResponse>

  execute(options?: RpcOptions): DuplexStreamingCall<ExecuteRequest, ExecuteResponse>

  resolveProgram(
    input: ResolveProgramRequest,
    options?: RpcOptions,
  ): UnaryCall<ResolveProgramRequest, ResolveProgramResponse>
}

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
