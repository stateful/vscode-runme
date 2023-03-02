import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import EventEmitter from 'node:events'

import { Disposable, Uri } from 'vscode'

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
    events: EventEmitter

    constructor(extBasePath: string, options: IServerConfig) {
        this.#port = getPortNumber()
        this.#loggingEnabled = enableServerLogs()
        this.#binaryPath = getBinaryPath(extBasePath, process.platform)
        this.#retryOnFailure = options.retryOnFailure || false
        this.#maxNumberOfIntents = options.maxNumberOfIntents
        this.#intent = 0
        this.#acceptsIntents = options.acceptsConnection?.intents || 50
        this.#acceptsInterval = options.acceptsConnection?.interval || 200
        this.events = new EventEmitter()
    }

    dispose() {
        this.events.removeAllListeners()
        this.#process?.removeAllListeners()
        this.#process?.kill()
    }

    async isRunning(): Promise<boolean> {
      const client = initParserClient()
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

    private address() {
      return `${SERVER_ADDRESS}:${this.#port}`
    }

    async start(): Promise<string | RunmeServerError> {
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

        while (!(await isPortAvailable(this.#port))) {
          this.#port++
        }

        this.#process = spawn(binaryLocation, [
            'server',
            '--address',
            this.address()
        ])

        this.#process.on('close', () => {
            if (this.#loggingEnabled) {
                console.log(`[Runme] Server process #${this.#process?.pid} closed`)
            }
            this.events.emit('closed')
        })


        this.#process.stderr.once('data', () => {
            console.log(`[Runme] Server process #${this.#process?.pid} started on port ${this.#port}`)
        })

        this.#process.stderr.on('data', (data) => {
            if (this.#loggingEnabled) {
                console.log(data.toString())
            }
        })

        return new Promise((resolve, reject) => {
            this.#process!.stderr.on('data', (data) => {
                const msg = data.toString()
                try {
                    const log = JSON.parse(msg)
                    if (log.addr === this.address()) {
                        return resolve(log.addr)
                    }
                } catch (err: any) {
                    reject(new RunmeServerError(`Server failed, reason: ${msg || (err as Error).message}`))
                }
            })
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

    async launch(): Promise<string | RunmeServerError> {
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
        await this.acceptsConnection()
        return addr
    }

    private _port() {
      return this.#port
    }
}

export default RunmeServer
