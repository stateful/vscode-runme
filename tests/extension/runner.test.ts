import path from 'node:path'

import { vi, suite, test, expect } from 'vitest'
import type { ExecuteResponse } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb'

import { 
  GrpcRunner, 
  GrpcRunnerEnvironment, 
  GrpcRunnerProgramSession, 
  RunProgramOptions 
} from '../../src/extension/runner'

vi.mock('vscode', () => ({ 
  ...import(path.join(process.cwd(), '__mocks__', 'vscode')) ,
  EventEmitter: getEventEmitterClass()
}))

vi.mock('@protobuf-ts/grpc-transport', () => ({
  GrpcTransport: class {
    constructor() {}

    close() { }
  }
}))

let id = 0

const resetId = () => { id = 0 }

const createSession = vi.fn(() => ({
  id: (id++).toString()
}))

const deleteSession = vi.fn(async () => ({

}))

function getEventEmitterClass() {
  return class EventEmitter<T> {
    listeners: MessageCallback<T>[] = []
    
    event: Event<T> = (listener) => {
      this.listeners.push(listener)
  
      return () => {
        this.listeners = this.listeners.filter(x => x !== listener)
      }
    }
  
    fire(data: T) {
      this.listeners.forEach(l => l(data))
    }
  }
}

type MessageCallback<T> = (message: T) => void
type Event<T> = (listener: MessageCallback<T>) => (() => void)

const EventEmitter = getEventEmitterClass()

class MockedDuplexClientStream {
  constructor() {}

  _onMessage = new EventEmitter<ExecuteResponse>()
  _onComplete = new EventEmitter<void>()
  _onError = new EventEmitter<Error>()

  responses = {
    onMessage: this._onMessage.event,
    onComplete: this._onComplete.event,
    onError: this._onError.event
  }

  requests = {
    send: vi.fn(async () => {}),
    complete: vi.fn()
  }
}

vi.mock('../../src/extension/grpc/client', () => ({
  RunnerServiceClient: class { 
    constructor() {}

    async createSession() { 
      return {
        response: {
          session: createSession()
        }
      }
    }

    async deleteSession() {
      return {
        response: deleteSession()
      }
    }

    execute() {
      return new MockedDuplexClientStream()
    }
  }
}))

vi.mock('@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb', () => ({
  default: { },
  CreateSessionRequest: {
    create: vi.fn((x: any) => x)
  }
}))

suite('grpc Runner', () => {
  test('environment dispose is called on runner dispose', async () => {
    resetId()
    deleteSession.mockClear()
    
    const runner = new GrpcRunner()
    const environment = (await runner.createEnvironment()) as GrpcRunnerEnvironment

    const oldEnvDispose = environment.dispose

    const environmentDispose = vi.fn(async () => { 
      await oldEnvDispose.call(environment)
    })

    environment.dispose = environmentDispose

    await runner.dispose()

    expect(environmentDispose).toBeCalledTimes(1)
    expect(deleteSession).toBeCalledTimes(1)
  })

  suite('grpc program session', () => {
    test('session dispose is called on runner dispose', async () => {
      const { runner, session, duplex } = await createNewSession()
      
      const oldSessionDispose = session.dispose
  
      const sessionDispose = vi.fn(async () => {
        await oldSessionDispose.call(session)
      })
  
      session.dispose = sessionDispose
  
      await runner.dispose()
  
      expect(sessionDispose).toBeCalledTimes(1)
      expect(duplex.requests.complete).toBeCalledTimes(1)
    })

    test('duplex onMessage calls stdout raw', async () => {
      const { duplex, stdoutListener, stderrListener } = await createNewSession()

      duplex._onMessage.fire({
        stdoutData: Buffer.from('test'),
        stderrData: Buffer.from('')
      })

      expect(stdoutListener).toBeCalledTimes(1)
      expect(stdoutListener).toBeCalledWith(Buffer.from('test'))

      expect(stderrListener).not.toBeCalled()
    })

    test('duplex onMessage calls stderr raw', async () => {
      const { duplex, stdoutListener, stderrListener } = await createNewSession()

      duplex._onMessage.fire({
        stdoutData: Buffer.from(''),
        stderrData: Buffer.from('test')
      })

      expect(stdoutListener).not.toBeCalled()
      
      expect(stderrListener).toBeCalledTimes(1)
      expect(stderrListener).toBeCalledWith(Buffer.from('test'))
    })

    test('duplex onMessage calls onDidWrite', async () => {
      const { duplex, writeListener } = await createNewSession()

      duplex._onMessage.fire({
        stdoutData: Buffer.from('test'),
        stderrData: Buffer.from('')
      })

      expect(writeListener).toBeCalledTimes(1)
      expect(writeListener).toBeCalledWith('test')
    })

    test('duplex onMessage calls onDidErr', async () => {
      const { duplex, errListener } = await createNewSession()

      duplex._onMessage.fire({
        stdoutData: Buffer.from(''),
        stderrData: Buffer.from('test')
      })

      expect(errListener).toBeCalledTimes(1)
      expect(errListener).toBeCalledWith('test')
    })

    test('duplex onMessage calls close', async () => {
      const { 
        duplex, 
        stdoutListener, 
        stderrListener, 
        closeListener 
      } = await createNewSession()

      duplex._onMessage.fire({
        stdoutData: Buffer.from(''),
        stderrData: Buffer.from(''),
        exitCode: {
          value: 1
        }
      })

      expect(stdoutListener).not.toBeCalled()
      expect(stderrListener).not.toBeCalled()

      expect(closeListener).toBeCalledTimes(1)
      expect(closeListener).toBeCalledWith(1)
    })
  })
})

function getMockedDuplex(session: GrpcRunnerProgramSession): MockedDuplexClientStream {
  return session['session'] as unknown as MockedDuplexClientStream
}

async function createNewSession(options: Partial<RunProgramOptions> = {}, runner?: GrpcRunner) {
  runner ??= new GrpcRunner()
  const session = (await runner.createProgramSession({
    programName: 'sh',
    ...options
  })) as GrpcRunnerProgramSession

  const stdoutListener = vi.fn()
  session.onStdoutRaw(stdoutListener)
  const stderrListener = vi.fn()
  session.onStderrRaw(stderrListener)
  const closeListener = vi.fn()
  session.onDidClose(closeListener)
  const writeListener = vi.fn()
  session.onDidWrite(writeListener)
  const errListener = vi.fn()
  session.onDidErr(errListener)

  return { 
    runner, 
    session, 
    duplex: getMockedDuplex(session),
    stdoutListener,
    stderrListener,
    closeListener,
    writeListener,
    errListener,
  }
}