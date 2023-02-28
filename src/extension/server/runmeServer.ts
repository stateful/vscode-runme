import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import EventEmitter from 'node:events'

import { Disposable } from 'vscode'

import { SERVER_ADDRESS } from '../../constants'
import { enableServerLogs, getBinaryLocation, getPath, getPortNumber } from '../../utils/configuration'
import { initParserClient } from '../grpc/client'
import { DeserializeRequest } from '../grpc/serializerTypes'

import RunmeServerError from './runmeServerError'

export interface IServerConfig {
    assignPortDynamically?: boolean
    retryOnFailure?: boolean
    maxNumberOfIntents: number
}

class RunmeServer implements Disposable {

    #runningPort: number
    #process: ChildProcessWithoutNullStreams | undefined
    #binaryPath: string
    #retryOnFailure: boolean
    #maxNumberOfIntents: number
    #loggingEnabled: boolean
    #intent: number
    #address: string
    events: EventEmitter

    constructor(extBasePath: string, options: IServerConfig) {
        this.#runningPort = getPortNumber()
        this.#loggingEnabled = enableServerLogs()
        this.#binaryPath = getPath(extBasePath)
        this.#retryOnFailure = options.retryOnFailure || false
        this.#maxNumberOfIntents = options.maxNumberOfIntents
        this.#intent = 0
        this.#address = `${SERVER_ADDRESS}:${this.#runningPort}`
        this.events = new EventEmitter()
    }

    dispose() {
        this.events.removeAllListeners()
        this.#process?.removeAllListeners()
        this.#process?.kill()
    }

    async #isRunning(): Promise<boolean> {
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

    async #start(): Promise<object | number | RunmeServerError> {
        const running = await this.#isRunning()
        if (running) {
          console.log(`[Runme] Server already running on port ${this.#runningPort}`)
          return this.#runningPort
        }

        const binaryLocation = getBinaryLocation(this.#binaryPath, process.platform)

        const binaryExists = await fs.access(binaryLocation)
            .then(() => true, () => false)

        const isFile = await fs.stat(binaryLocation)
            .then((result) => {
                return result.isFile()
            }, () => false)

        if (!binaryExists || !isFile) {
            throw new RunmeServerError('Cannot find server binary file')
        }

        this.#process = spawn(binaryLocation, [
            'server',
            '--address',
            this.#address
        ])

        this.#process.on('close', () => {
            if (this.#loggingEnabled) {
                console.log(`[Runme] Server process #${this.#process?.pid} closed`)
            }
            this.events.emit('closed')
        })


        this.#process.stderr.once('data', () => {
            console.log(`[Runme] Server process #${this.#process?.pid} started`)
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
                    if (log.addr === this.#address) {
                        return resolve(log.addr)
                    }
                } catch (err: any) {
                    reject(new RunmeServerError(`Server failed, reason: ${msg || (err as Error).message}`))
                }
            })
        })
    }

    async launch(): Promise<object | number | RunmeServerError> {
        try {
            return await this.#start()
        } catch (e) {
            if (this.#retryOnFailure && this.#maxNumberOfIntents > this.#intent) {
                this.#intent++
                return this.launch()
            }
            throw new RunmeServerError(`Cannot start server. Error: ${(e as Error).message}`)
        }
    }
}

export default RunmeServer
