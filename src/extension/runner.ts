import { ChannelCredentials } from '@grpc/grpc-js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { DuplexStreamingCall } from '@protobuf-ts/runtime-rpc/build/types/duplex-streaming-call'
import {
  Pseudoterminal,
  Event,
  EventEmitter,
  Disposable,
} from 'vscode'
import type { UInt32Value } from '@buf/stateful_runme.community_timostamm-protobuf-ts/google/protobuf/wrappers_pb'
import { RpcError } from '@protobuf-ts/runtime-rpc'

import type { DisposableAsync } from '../types'

import {
  CreateSessionRequest,
  ExecuteRequest,
  ExecuteResponse,
  ExecuteStop,
  Session,
} from './grpc/runnerTypes'
import { RunnerServiceClient } from './grpc/client'
import { getGrpcHost } from './utils'

type ExecuteDuplex = DuplexStreamingCall<ExecuteRequest, ExecuteResponse>

export interface RunProgramOptions {
  programName: string
  args?: string[]
  cwd?: string
  envs?: string[]
  exec?:
    |{
      type: 'commands'
      commands: string[]
    }
    |{
      type: 'script'
      script: string
    }
  tty?: boolean
  environment?: IRunnerEnvironment
}

export interface IRunner extends Disposable {
  close(): void

  createEnvironment(
    envs?: string[],
    metadata?: { [index: string]: string }
  ): Promise<IRunnerEnvironment>

  createProgramSession(opts: RunProgramOptions): Promise<IRunnerProgramSession>
}

export interface IRunnerEnvironment extends DisposableAsync { }

export interface IRunnerProgramSession extends DisposableAsync, Pseudoterminal {
  /**
   * Called when an unrecoverable error occurs, for instance a failure over gRPC
   * transport
   *
   * Note that this is different from `onDidErr`, which is for stderr
   */
  readonly onInternalErr: Event<Error>

  readonly onDidErr: Event<string>
  readonly onDidClose: Event<number>

  /**
   * Implementers should **still call `onDidWrite`** to stay compatible with
   * VSCode pseudoterminal interface
   */
  readonly onStdoutRaw: Event<Uint8Array>
  /**
   * Implementers should **still call `onDidErr`** to stay compatible with
   * VSCode pseudoterminal interface
   */
  readonly onStderrRaw: Event<Uint8Array>

  handleInput(message: string): Promise<void>

  setRunOptions(opts: RunProgramOptions): void
  run(): Promise<void>
  hasExited(): boolean
}

export class GrpcRunner implements IRunner {
  protected readonly client: RunnerServiceClient
  protected transport: GrpcTransport

  private children: WeakRef<DisposableAsync>[] = []

  constructor() {
    this.transport = new GrpcTransport({
      host: getGrpcHost(),
      channelCredentials: ChannelCredentials.createInsecure(),
    })

    this.client = new RunnerServiceClient(this.transport)
  }

  async createProgramSession(
    opts: RunProgramOptions
  ): Promise<IRunnerProgramSession> {
    const session = new GrpcRunnerProgramSession(
      this.client,
      opts
    )

    this.registerChild(session)

    return session
  }

  createEnvironment(
    envs?: string[],
    metadata?: { [index: string]: string }
  ) {
    const request = CreateSessionRequest.create({
      metadata, envs
    })

    try {
      return this.client
        .createSession(request)
        .then(({ response: { session } }) => {
          if(!session) {
            throw new Error('Did not receive session!!')
          }

          const environment = new GrpcRunnerEnvironment(
            this.client,
            session
          )

          this.registerChild(environment)
          return environment
        })
        .catch((e) => {
          throw e
        })
    } catch (err: any) {
      console.error(err)
      this.close()
      throw err
    }
  }

  close(): void {
    this.transport.close()
  }

  async dispose(): Promise<void> {
    await Promise.all(
      this.children.map(c => c.deref()?.dispose())
    ).finally(() => this.close())
  }

  /**
   * Register disposable child weakref, so that it can still be GC'ed even if
   * there is a reference to it in this object and its already been disposed of
   */
  protected registerChild(d: DisposableAsync) {
    this.children.push(new WeakRef(d))
  }
}

export class GrpcRunnerProgramSession implements IRunnerProgramSession {
  private disposables: Disposable[] = []

  readonly _onInternalErr = this.register(new EventEmitter<Error>())
  readonly _onDidWrite    = this.register(new EventEmitter<string>())
  readonly _onDidErr      = this.register(new EventEmitter<string>())
  readonly _onDidClose    = this.register(new EventEmitter<number>())
  readonly _onStdoutRaw   = this.register(new EventEmitter<Uint8Array>())
  readonly _onStderrRaw   = this.register(new EventEmitter<Uint8Array>())

  readonly onDidWrite = this._onDidWrite.event
  readonly onDidErr = this._onDidErr.event
  readonly onDidClose = this._onDidClose.event
  readonly onStdoutRaw = this._onStdoutRaw.event
  readonly onStderrRaw = this._onStderrRaw.event
  readonly onInternalErr = this._onInternalErr.event

  private readonly session: ExecuteDuplex

  private exitCode: UInt32Value|undefined

  private isDisposed = false

  protected initialized = false

  protected buffer = ''

  constructor(
    private readonly client: RunnerServiceClient,
    protected opts: RunProgramOptions
  ) {
    this.session = client.execute()

    this.register(
      this._onStdoutRaw.event((data) => {
        // TODO: web compat
        const stdout = Buffer.from(data).toString('utf-8')
        this._onDidWrite.fire(stdout)
      })
    )

    this.register(
      this._onStderrRaw.event((data) => {
        // TODO: web compat
        const stderr = Buffer.from(data).toString('utf-8')
        this._onDidErr.fire(stderr)
      })
    )

    this.session.responses.onMessage(({ stderrData, stdoutData, exitCode }) => {
      if(stdoutData.length > 0) {
        this._onStdoutRaw.fire(stdoutData)
      }

      if(stderrData.length > 0) {
        this._onStderrRaw.fire(stderrData)
      }

      if(exitCode) {
        this._onDidClose.fire(exitCode.value)
        this.exitCode = exitCode
        this.dispose()
      }
    })

    this.session.responses.onComplete(() => {
      if(!this.hasExited()) {
        this.error(new Error('gRPC Server closed output stream unexpectedly!'))
      }
    })

    this.session.responses.onError((error) => {
      if(error instanceof RpcError) {
        console.error('RpcError occurred!', {
          // duping here since `Error` types are uninspectable in console
          code: error.code,
          message: error.message,
          method: error.methodName,
          meta: error.meta,
          service: error.serviceName,
          name: error.name,
        }, error)
      } else {
        console.error('Unexpected error!!', error)
      }

      this.error(error)
    })
  }

  protected async init(opts?: RunProgramOptions) {
    if(this.initialized) { throw new Error('Already initialized!') }
    if(opts) { this.opts = opts }

    this.initialized = true

    await this.session.requests.send(GrpcRunnerProgramSession.runOptionsToExecuteRequest(this.opts))
  }

  setRunOptions(opts: RunProgramOptions): void {
    this.opts = opts
  }

  async run(opts?: RunProgramOptions): Promise<void> {
    await this.init(opts)
  }

  isPseudoterminal(): boolean {
    return !!this.opts.tty
  }

  async handleInput(data: string): Promise<void> {
    if(this.hasExited()) { throw new Error('Cannot write to closed program session!') }
    this.sendRawInput(data)

    // if(this.isPseudoterminal()) {
    //   switch (data) {
    //     case '\r': // Enter
    //       const command = this.buffer + '\n'

    //       // lastCommand = buffer
    //       console.log("Sending command", command)

    //       this.sendRawInput(command)
    //         // .then(() => console.log('sent input', command))
    //       break
    //     case '\u007F': // Backspace (DEL)
    //       if (this.buffer.length > 0) {
    //         this._onDidWrite.fire('\b \b')
    //         if (this.buffer.length > 0) {
    //           this.buffer = this.buffer.slice(0, this.buffer.length - 1)
    //         }
    //       }
    //       break
    //     case '\u0003': // Ctrl+C
    //       this._onDidWrite.fire('^C')
    //       break
    //     default:
    //       if (
    //         (data >= String.fromCharCode(0x20) &&
    //           data <= String.fromCharCode(0x7e)) ||
    //         data >= '\u00a0'
    //       ) {
    //         this.buffer += data
    //         this._onDidWrite.fire(data)
    //       }
    //   }
    // } else {
    //   this.sendRawInput(data)
    // }
  }

  protected async sendRawInput(data: string) {
    const inputData = Buffer.from(data)

    this.session.requests.send(ExecuteRequest.create({
      inputData: inputData
    }))
  }

  open(): void {
    // in pty, we wait for open to run
    this.run()
  }

  async dispose() {
    if(this.isDisposed) { return }
    this.isDisposed = true

    await this.session.requests.complete()
  }

  /**
   * Manually closed by the user
   *
   * Implemented for compatibility with VSCode's `Pseudoterminal` interface;
   * please use `_close` internally
   */
  close() {
    if(this.hasExited()) { return }

    this.session.requests.send(ExecuteRequest.create({
      stop: this.isPseudoterminal() ? ExecuteStop.INTERRUPT : ExecuteStop.KILL
    }))
  }

  /**
   * Unrecoverable internal error
   */
  private error(error: Error) {
    this._onInternalErr.fire(error)
    this.dispose()
  }

  hasExited() {
    return this.exitCode !== undefined || this.isDisposed
  }

  protected register<T extends Disposable>(disposable: T): T {
    this.disposables.push(disposable)
    return disposable
  }

  static runOptionsToExecuteRequest(
    { programName, args, cwd, environment, exec, tty, envs }: RunProgramOptions
  ): ExecuteRequest {
    if(environment && !(environment instanceof GrpcRunnerEnvironment)) {
      throw new Error('Expected gRPC environment!')
    }

    return ExecuteRequest.create({
      arguments: args,
      envs,
      directory: cwd,
      tty,
      sessionId: environment?.getSessionId(),
      programName,
      ...exec?.type === 'commands' && { commands: exec.commands },
      ...exec?.type === 'script' && { script: exec.script }
    })
  }
}

export class GrpcRunnerEnvironment implements IRunnerEnvironment {
  constructor(
    private readonly client: RunnerServiceClient,
    private readonly session: Session
  ) { }

  getRunmeSession(): Session {
    return this.session
  }

  getSessionId(): string {
    return this.session.id
  }

  async dispose() {
    await this.delete()
  }

  private async delete() {
    return await this.client.deleteSession({ id: this.getSessionId() })
  }
}
