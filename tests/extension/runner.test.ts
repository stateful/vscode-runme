import path from 'node:path'

import { vi, suite, test, expect, beforeEach } from 'vitest'
import type { ExecuteResponse } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v1/runner_pb'
import { type GrpcTransport } from '@protobuf-ts/grpc-transport'
import { EventEmitter } from 'vscode'

import {
  GrpcRunner,
  GrpcRunnerEnvironment,
  GrpcRunnerProgramSession,
  RunProgramOptions
} from '../../src/extension/runner'


vi.mock('../../src/extension/utils', () => ({
  getGrpcHost: vi.fn().mockReturnValue('127.0.0.1:7863')
}))

vi.mock('vscode', async () => ({
  ...await import(path.join(process.cwd(), '__mocks__', 'vscode')) ,
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
  },
  ExecuteRequest: {
    create: vi.fn((x: any) => x)
  },
  Winsize: {
    create: vi.fn((x: any) => x)
  }
}))

class MockedRunmeServer {
  _onTransportReady = new EventEmitter<{ transport: GrpcTransport }>()
  _onClose = new EventEmitter<{ code: number|null }>()

  onTransportReady = this._onTransportReady.event
  onClose = this._onClose.event
}

beforeEach(() => {
  resetId()
  deleteSession.mockClear()
})

suite('grpc Runner', () => {
  test('environment dispose is called on runner dispose', async () => {
    const { runner } = createGrpcRunner()
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

  test('cannot create environment if server not initialized', async () => {
    const { runner } = createGrpcRunner(false)
    await expect(runner.createEnvironment()).rejects.toThrowError('Client is not active!')
  })

  test('cannot create program session if server not initialized', async () => {
    const { runner } = createGrpcRunner(false)
    await expect(runner.createProgramSession({ programName: 'sh' })).rejects.toThrowError('Client is not active!')
  })

  test('cannot get environment variables not initialized', async () => {
    const { runner } = createGrpcRunner(false)
    await expect(runner.getEnvironmentVariables({} as any)).rejects.toThrowError('Client is not active!')
  })

  test('cannot create environment if server closed', async () => {
    const { runner, server } = createGrpcRunner(true)

    server._onClose.fire({ code: null })
    await expect(runner.createEnvironment()).rejects.toThrowError('Client is not active!')
  })

  test('cannot create program session if server closed', async () => {
    const { runner, server } = createGrpcRunner(true)

    server._onClose.fire({ code: null })
    await expect(runner.createProgramSession({ programName: 'sh' })).rejects.toThrowError('Client is not active!')
  })

  test('cannot get environment variables if server closed', async () => {
    const { runner, server } = createGrpcRunner(true)

    server._onClose.fire({ code: null })
    await expect(runner.getEnvironmentVariables({} as any)).rejects.toThrowError('Client is not active!')
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

    test('initial request has winsize', async () => {
      const { duplex, session } = await createNewSession({
        tty: true
      })

      session.open({ columns: 50, rows: 20 })

      expect(duplex.requests.send).toBeCalledTimes(1)
      expect((duplex.requests.send.mock.calls[0] as any)[0]).toMatchObject({
        tty: true,
        winsize: {
          cols: 50,
          rows: 20,
        }
      })
    })

    test('further requests have winsize', async () => {
      const { duplex, session } = await createNewSession({
        tty: true
      })

      session.open({ columns: 50, rows: 20 })

      session.setDimensions({ columns: 60, rows: 30 })

      expect(duplex.requests.send).toBeCalledTimes(2)
      expect((duplex.requests.send.mock.calls[1] as any)[0]).toStrictEqual({
        winsize: {
          cols: 60,
          rows: 30,
        }
      })
    })
  })
})

function getMockedDuplex(session: GrpcRunnerProgramSession): MockedDuplexClientStream {
  return session['session'] as unknown as MockedDuplexClientStream
}

function createGrpcRunner(initialize = true) {
  const server = new MockedRunmeServer()
  const runner = new GrpcRunner(server as any)

  if (initialize) {
    server._onTransportReady.fire({ transport: {} as any })
  }

  return { server, runner }
}

async function createNewSession(options: Partial<RunProgramOptions> = {}, runner?: GrpcRunner, initialize?: boolean) {
  const { runner: generatedRunner, server } = createGrpcRunner(initialize)

  runner ??= generatedRunner
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
    server,
  }
}
