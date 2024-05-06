import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { DuplexStreamingCall } from '@protobuf-ts/runtime-rpc/build/types/duplex-streaming-call'
import { type Disposable, EventEmitter } from 'vscode'
import { RpcOptions, UnaryCall } from '@protobuf-ts/runtime-rpc'

import {
  CreateSessionRequest,
  CreateSessionResponse,
  DeleteSessionRequest,
  DeleteSessionResponse,
  ExecuteRequest,
  ExecuteResponse,
  GetSessionRequest,
  GetSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  // MonitorEnvStoreRequest,
  // MonitorEnvStoreResponse,
  ResolveProgramRequest,
  ResolveProgramResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
} from '../grpc/runner/v2alpha1'
import { IRunnerServiceClient, RunnerServiceClient } from '../grpc/client'
import { IServer } from '../server/runmeServer'

import { IRunnerReady } from '.'

export type IRunnerClient = IRunnerServiceClient & Disposable

export class GrpcRunnerClient implements IRunnerClient {
  private disposables: Disposable[] = []

  protected address?: string
  protected client?: RunnerServiceClient
  protected _onReady?: EventEmitter<IRunnerReady>

  constructor(
    protected server: IServer,
    ready?: EventEmitter<IRunnerReady>,
  ) {
    this._onReady = ready
    this.disposables.push(
      server.onTransportReady(({ transport, address }) => {
        this.address = address
        this.initRunnerClient(transport)
      }),
    )

    this.disposables.push(
      server.onClose(() => {
        return this.deinitRunnerClient()
      }),
    )
  }

  private deinitRunnerClient() {
    this.client = undefined
  }

  private async initRunnerClient(transport?: GrpcTransport) {
    this.deinitRunnerClient()
    this.client = new RunnerServiceClient(transport ?? (await this.server.transport()))
    this._onReady?.fire({ address: this.address })
  }

  static assertClient(client: RunnerServiceClient | undefined): asserts client {
    if (!client) {
      throw new Error('Client is not active!')
    }
  }

  protected register<T extends Disposable>(d: T): T {
    this.disposables.push(d)
    return d
  }

  async dispose(): Promise<void> {
    this.disposables.forEach((d) => d.dispose())
  }

  createSession(
    input: CreateSessionRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<CreateSessionRequest, CreateSessionResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.createSession(input, options)
  }

  getSession(
    input: GetSessionRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<GetSessionRequest, GetSessionResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.getSession(input, options)
  }

  listSessions(
    input: ListSessionsRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<ListSessionsRequest, ListSessionsResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.listSessions(input, options)
  }

  deleteSession(
    input: DeleteSessionRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<DeleteSessionRequest, DeleteSessionResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.deleteSession(input, options)
  }

  updateSession(
    input: UpdateSessionRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<UpdateSessionRequest, UpdateSessionResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.updateSession(input, options)
  }

  execute(options?: RpcOptions | undefined): DuplexStreamingCall<ExecuteRequest, ExecuteResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.execute(options)
  }

  resolveProgram(
    input: ResolveProgramRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<ResolveProgramRequest, ResolveProgramResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.resolveProgram(input, options)
  }

  // monitorEnvStore(
  //   input: MonitorEnvStoreRequest,
  //   options?: RpcOptions | undefined,
  // ): ServerStreamingCall<MonitorEnvStoreRequest, MonitorEnvStoreResponse> {
  //   GrpcRunnerClient.assertClient(this.client)
  //   return this.client.monitorEnvStore(input, options)
  // }
}
