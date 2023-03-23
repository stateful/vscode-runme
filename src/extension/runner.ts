import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { DuplexStreamingCall } from '@protobuf-ts/runtime-rpc/build/types/duplex-streaming-call'
import {
  type Pseudoterminal,
  type Event,
  type Disposable,
  type TerminalDimensions,
  EventEmitter,
} from 'vscode'
import { RpcError } from '@protobuf-ts/runtime-rpc'

import type { DisposableAsync } from '../types'

import {
  CreateSessionRequest,
  ExecuteRequest,
  ExecuteResponse,
  ExecuteStop,
  GetSessionRequest,
  Session,
  Winsize,
} from './grpc/runnerTypes'
import { RunnerServiceClient } from './grpc/client'
import { getShellPath } from './executors/utils'
import RunmeServer from './server/runmeServer'

type ExecuteDuplex = DuplexStreamingCall<ExecuteRequest, ExecuteResponse>

export type RunProgramExecution = {
  type: 'commands'
  commands: string[]
} | {
  type: 'script'
  script: string
}

export interface RunProgramOptions {
  programName: string
  args?: string[]
  cwd?: string
  envs?: string[]
  exec?:
    RunProgramExecution
  tty?: boolean
  environment?: IRunnerEnvironment
  terminalDimensions?: TerminalDimensions
}

export interface IRunner extends Disposable {
  /**
   * Called when underlying transport is ready
   *
   * May be called multiple times if server restarts
   */
  readonly onReady: Event<void>

  close(): void

  createEnvironment(
    envs?: string[],
    metadata?: { [index: string]: string }
  ): Promise<IRunnerEnvironment>

  createProgramSession(opts: RunProgramOptions): Promise<IRunnerProgramSession>

  getEnvironmentVariables(
    environment: IRunnerEnvironment,
  ): Promise<Record<string, string>|undefined>

  setEnvironmentVariables(
    environment: IRunnerEnvironment,
    variables: Record<string, string|undefined>
  ): Promise<boolean>
}

interface IRunnerChild extends DisposableAsync { }

export interface IRunnerEnvironment extends IRunnerChild { }

export type RunnerExitReason =
  |{
    type: 'exit'
    code: number
  }
  |{
    type: 'error'
    error: Error
  }
  |{
    type: 'disposed'
  }

export interface IRunnerProgramSession extends IRunnerChild, Pseudoterminal {
  /**
   * Called when an unrecoverable error occurs, for instance a failure over gRPC
   * transport
   *
   * Note that this is different from `onDidErr`, which is for stderr
   */
  readonly onInternalErr: Event<Error>

  readonly onDidErr: Event<string>
  readonly onDidClose: Event<number | void>

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
  hasExited(): RunnerExitReason|undefined
}

export class GrpcRunner implements IRunner {
  protected client?: RunnerServiceClient

  private children: WeakRef<IRunnerChild>[] = []
  private disposables: Disposable[] = []

  protected _onReady = this.register(new EventEmitter<void>())
  onReady = this._onReady.event

  constructor(protected server: RunmeServer) {
    this.disposables.push(
      server.onTransportReady(({ transport }) => this.initRunnerClient(transport))
    )

    this.disposables.push(
      server.onClose(() => this.deinitRunnerClient())
    )
  }

  private deinitRunnerClient() {
    this.disposeChildren()
    this.client = undefined
  }

  private initRunnerClient(transport?: GrpcTransport) {
    this.deinitRunnerClient()
    this.client = new RunnerServiceClient(transport ?? this.server.transport())
    this._onReady.fire()
  }

  protected static assertClient(client: RunnerServiceClient|undefined): asserts client {
    if(!client) {
      throw new Error('Client is not active!')
    }
  }

  async createProgramSession(
    opts: RunProgramOptions
  ): Promise<IRunnerProgramSession> {
    GrpcRunner.assertClient(this.client)

    const session = new GrpcRunnerProgramSession(
      this.client,
      opts
    )

    this.registerChild(session)

    return session
  }

  async createEnvironment(
    envs?: string[],
    metadata?: { [index: string]: string }
  ) {
    GrpcRunner.assertClient(this.client)

    const request = CreateSessionRequest.create({
      metadata, envs
    })

    try {
      const client = this.client

      return client
        .createSession(request)
        .then(({ response: { session } }) => {
          if(!session) {
            throw new Error('Did not receive session!!')
          }

          const environment = new GrpcRunnerEnvironment(
            client,
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

  async getEnvironmentVariables(
    environment: IRunnerEnvironment,
  ): Promise<Record<string, string> | undefined> {
    GrpcRunner.assertClient(this.client)

    if(!(environment instanceof GrpcRunnerEnvironment)) {
      throw new Error('Invalid environment!')
    }

    const id = environment.getSessionId()

    const { session } = await this.client.getSession(GetSessionRequest.create({ id })).response

    if(!session) { return undefined }

    return session.envs.reduce((prev, curr) => {
      const [key, value = ''] = curr.split(/\=(.*)/s)
      prev[key] = value

      return prev
    }, {} as Record<string, string>)
  }

  // TODO: create a gRPC endpoint for this so it can be done without making a
  // new program (and hopefully preventing race conditions etc)
  async setEnvironmentVariables(
    environment: IRunnerEnvironment,
    variables: Record<string, string|undefined>,
    shellPath?: string
  ): Promise<boolean> {
    const commands = Object.entries(variables)
      .map(([key, val]) => `export ${key}=${val ?? ''}`)

    const program = await this.createProgramSession({
      programName: shellPath ?? getShellPath() ?? 'sh',
      environment,
      exec: {
        type: 'commands',
        commands
      },
    })

    return await new Promise<boolean>((resolve, reject) => {
      program.onDidClose((code) => {
        resolve(code === 0)
      })

      program.onInternalErr((e) => {
        reject(e)
      })

      program.run()
    })
  }

  close(): void { }

  async dispose(): Promise<void> {
    this.disposables.forEach(d => d.dispose())
    await this.disposeChildren().finally(() => this.close())
  }

  async disposeChildren(): Promise<void> {
    await Promise.all(
      this.children.map(c => c.deref()?.dispose())
    )
  }

  /**
   * Register disposable child weakref, so that it can still be GC'ed even if
   * there is a reference to it in this object and its already been disposed of
   */
  protected registerChild(d: DisposableAsync) {
    this.children.push(new WeakRef(d))
  }

  protected register<T extends Disposable>(d: T): T {
    this.disposables.push(d)
    return d
  }
}

export class GrpcRunnerProgramSession implements IRunnerProgramSession {
  private disposables: Disposable[] = []

  readonly _onInternalErr = this.register(new EventEmitter<Error>())
  readonly _onDidWrite    = this.register(new EventEmitter<string>())
  readonly _onDidErr      = this.register(new EventEmitter<string>())
  readonly _onDidClose    = this.register(new EventEmitter<number | void>())
  readonly _onStdoutRaw   = this.register(new EventEmitter<Uint8Array>())
  readonly _onStderrRaw   = this.register(new EventEmitter<Uint8Array>())

  readonly onDidWrite = this._onDidWrite.event
  readonly onDidErr = this._onDidErr.event
  readonly onDidClose = this._onDidClose.event
  readonly onStdoutRaw = this._onStdoutRaw.event
  readonly onStderrRaw = this._onStderrRaw.event
  readonly onInternalErr = this._onInternalErr.event

  protected exitReason?: RunnerExitReason

  private readonly session: ExecuteDuplex

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

    this.register( this._onDidClose.event(() => this.dispose()) )
    this.register( this._onInternalErr.event(() => this.dispose()) )

    this.session.responses.onMessage(({ stderrData, stdoutData, exitCode }) => {
      if(stdoutData.length > 0) {
        this._onStdoutRaw.fire(stdoutData)
      }

      if(stderrData.length > 0) {
        this._onStderrRaw.fire(stderrData)
      }

      if(exitCode) {
        this._close({ type: 'exit', code: exitCode.value })
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

    this.opts.envs ??= []

    if(this.opts.tty) {
      this.opts.envs.push('TERM=xterm-256color')
    } else {
      this.opts.envs.push('TERM=')
    }

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

  open(initialDimensions?: TerminalDimensions): void {
    // Workaround to force terminal to close if opened after early exit
    // TODO(mxs): find a better solution here
    if(this.hasExited()) {
      this._onDidClose.fire(1)
      return
    }

    this.opts.terminalDimensions = initialDimensions

    // in pty, we wait for open to run
    this.run()
  }

  async dispose() {
    if(this.isDisposed) { return }
    this.isDisposed = true

    this._close({ type: 'disposed' })

    await this.session.requests.complete()
  }

  _close(reason: RunnerExitReason) {
    if (this.hasExited()) { return }

    this.exitReason = reason

    if(reason.type !== 'disposed') {
      this._onDidClose.fire(reason.type === 'exit' ? reason.code : 1)
    }
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
    this._close({ type: 'error', error })

    this._onInternalErr.fire(error)

    this.dispose()
  }

  setDimensions(dimensions: TerminalDimensions): void {
    this.session.requests.send(ExecuteRequest.create({
      winsize: terminalDimensionsToWinsize(dimensions)
    }))
  }

  hasExited() {
    return this.exitReason
  }

  protected register<T extends Disposable>(disposable: T): T {
    this.disposables.push(disposable)
    return disposable
  }

  static runOptionsToExecuteRequest(
    { programName, args, cwd, environment, exec, tty, envs, terminalDimensions }: RunProgramOptions
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
      ...exec?.type === 'script' && { script: exec.script },
      ...terminalDimensions && { winsize: terminalDimensionsToWinsize(terminalDimensions) },
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

function terminalDimensionsToWinsize({ rows, columns }: TerminalDimensions): Winsize {
  return Winsize.create({
    cols: columns,
    rows,
  })
}
