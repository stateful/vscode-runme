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
  ResolveVarsRequest,
  ResolveVarsResponse,
} from '../grpc/runnerTypes'
import { IRunnerServiceClient, RunnerServiceClient } from '../grpc/client'
import { IServer } from '../server/runmeServer'

export type IRunnerClient = IRunnerServiceClient & Disposable

export class GrpcRunnerClient implements IRunnerClient {
  private disposables: Disposable[] = []

  protected client?: RunnerServiceClient
  protected _onReady?: EventEmitter<void>

  constructor(
    protected server: IServer,
    ready?: EventEmitter<void>,
  ) {
    this._onReady = ready
    this.disposables.push(
      server.onTransportReady(({ transport }) => this.initRunnerClient(transport)),
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
    this._onReady?.fire()
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

  execute(options?: RpcOptions | undefined): DuplexStreamingCall<ExecuteRequest, ExecuteResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.execute(options)
  }

  resolveVars(
    input: ResolveVarsRequest,
    options?: RpcOptions | undefined,
  ): UnaryCall<ResolveVarsRequest, ResolveVarsResponse> {
    GrpcRunnerClient.assertClient(this.client)
    return this.client.resolveVars(input, options)
  }
}
