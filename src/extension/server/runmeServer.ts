import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import fs from 'node:fs/promises'

import { ChannelCredentials } from '@grpc/grpc-js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { Disposable, Uri, EventEmitter } from 'vscode'

import { SERVER_ADDRESS } from '../../constants'
import { enableServerLogs, getBinaryPath, getPortNumber } from '../../utils/configuration'
import { initParserClient } from '../grpc/client'
import { DeserializeRequest } from '../grpc/serializerTypes'
import { isPortAvailable } from '../utils'

import RunmeServerError from './runmeServerError'

export interface IServerConfig {
    assignPortDynamically?: boolean
    retryOnFailure?: boolean
    maxNumberOfIntents: number
    acceptsConnection?: {
      intents: number
      interval: number
    }
}

class RunmeServer implements Disposable {
    #port: number
    #process: ChildProcessWithoutNullStreams | undefined
    #binaryPath: Uri
    #retryOnFailure: boolean
    #maxNumberOfIntents: number
    #loggingEnabled: boolean
    #intent: number
    #acceptsIntents: number
    #acceptsInterval: number
    #disposables: Disposable[] = []
    #transport?: GrpcTransport

    readonly #onClose = this.register(new EventEmitter<{ code: number|null }>())
    readonly #onTransportReady = this.register(new EventEmitter<{ transport: GrpcTransport }>())

    readonly onClose = this.#onClose.event
    readonly onTransportReady = this.#onTransportReady.event

    constructor(
      extBasePath: Uri,
      options: IServerConfig,
      protected readonly externalServer: boolean,
      protected readonly enableRunner = false
    ) {
      this.#port = getPortNumber()
      this.#loggingEnabled = enableServerLogs()
      this.#binaryPath = getBinaryPath(extBasePath, process.platform)
      this.#retryOnFailure = options.retryOnFailure || false
      this.#maxNumberOfIntents = options.maxNumberOfIntents
      this.#intent = 0
      this.#acceptsIntents = options.acceptsConnection?.intents || 50
      this.#acceptsInterval = options.acceptsConnection?.interval || 200
    }

    dispose() {
      this.#disposables.forEach(d => d.dispose())
      this.disposeProcess()
    }

    private disposeProcess(process?: ChildProcessWithoutNullStreams) {
      process ??= this.#process

      if(process === this.#process) {
        this.#process = undefined
      }

      process?.removeAllListeners()
      process?.kill()
    }

    async isRunning(): Promise<boolean> {
      const client = initParserClient(this.transport())
      try {
        const deserialRequest = DeserializeRequest.create({ source: Buffer.from('## Server running', 'utf-8') })
        const request = client.deserialize(deserialRequest)
        const status = await request.status
        return status.code === 'OK'
      } catch (err: any) {
        if (err?.code === 'UNAVAILABLE') {
          return false
        }
        throw err
      }
    }

    protected address() {
      return `${SERVER_ADDRESS}:${this.#port}`
    }

    protected channelCredentials() {
      return ChannelCredentials.createInsecure()
    }

    protected closeTransport() {
      this.#transport?.close()
      this.#transport = undefined
    }

    transport() {
      if(this.#transport) { return this.#transport }

      this.#transport = new GrpcTransport({
        host: this.address(),
        channelCredentials: this.channelCredentials(),
      })

      return this.#transport
    }

    async start(): Promise<string> {
        const binaryLocation = this.#binaryPath.fsPath

        const binaryExists = await fs.access(binaryLocation)
            .then(() => true, () => false)

        const isFile = await fs.stat(binaryLocation)
            .then((result) => {
                return result.isFile()
            }, () => false)

        if (!binaryExists || !isFile) {
            throw new RunmeServerError('Cannot find server binary file')
        }

        this.#port = getPortNumber()
        while (!(await isPortAvailable(this.#port))) {
          this.#port++
        }

        const args = [
          'server',
          '--address',
          this.address()
        ]

        if(this.enableRunner) {
          args.push('--runner')
        }

        const process = spawn(binaryLocation, args)

        process.on('close', (code) => {
            if (this.#loggingEnabled) {
                console.log(`[Runme] Server process #${this.#process?.pid} closed with code ${code}`)
            }
            this.#onClose.fire({ code })

            this.disposeProcess(process)

            // try to relaunch
            this.launch()
        })


        process.stderr.once('data', () => {
            console.log(`[Runme] Server process #${this.#process?.pid} started on port ${this.#port}`)
        })

        process.stderr.on('data', (data) => {
            if (this.#loggingEnabled) {
                console.log(data.toString())
            }
        })

        this.#process = process

        return new Promise((resolve, reject) => {
          const cb = (data: any) => {
              const msg = data.toString()
              try {
                  const log = JSON.parse(msg)
                  if (log.addr === this.address()) {
                    return resolve(log.addr)
                  }
              } catch (err: any) {
                  reject(new RunmeServerError(`Server failed, reason: ${msg || (err as Error).message}`))
              } finally {
                process.stderr.off('data', cb)
              }
          }

          process.stderr.on('data', cb)
        })
    }

    async acceptsConnection(): Promise<void> {
        const INTERVAL = this.#acceptsInterval
        const INTENTS = this.#acceptsIntents
        let token: NodeJS.Timer
        let iter = 0
        let isRunning = false
        const ping = (resolve: Function, reject: Function) => {
          return async () => {
              iter++
              isRunning = await this.isRunning()
              if (isRunning) {
                  clearTimeout(token)
                  return resolve()
              } else if (iter > INTENTS) {
                  clearTimeout(token)
                  return reject(new RunmeServerError(`Server did not accept connections after ${iter*INTERVAL}ms`))
              }
              if (!token) {
                  token = setInterval(ping(resolve, reject), INTERVAL)
              }
          }
        }
        return new Promise<void>((resolve, reject) => {
            return ping(resolve, reject)()
        })
    }

    /**
     * Tries to launch server, retrying if needed
     *
     * If `externalServer` is set, then this only attempts to connect to the
     * server address
     *
     * @returns Address of server or error
     */
    async launch(): Promise<string> {
      if (this.externalServer) {
        await this.connect()
        return this.address()
      }

      let addr
      try {
          addr = await this.start()
      } catch (e) {
          if (this.#retryOnFailure && this.#maxNumberOfIntents > this.#intent) {
              this.#intent++
              return this.launch()
          }
          throw new RunmeServerError(`Cannot start server. Error: ${(e as Error).message}`)
      }

      await this.connect()

      return addr
    }

    protected async connect(): Promise<void> {
      this.closeTransport()
      await this.acceptsConnection()

      this.#onTransportReady.fire({ transport: this.transport() })
    }

    private _port() {
      return this.#port
    }

    protected register<T extends Disposable>(disposable: T): T {
      this.#disposables.push(disposable)
      return disposable
    }
}

export default RunmeServer
