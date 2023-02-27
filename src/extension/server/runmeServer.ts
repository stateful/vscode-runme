
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import EventEmitter from 'node:events'

import { Disposable } from 'vscode'

import { SERVER_ADDRESS } from '../../constants'
import { enableServerLogs, getPath, getPortNumber } from '../../utils/configuration'

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

    constructor(options: IServerConfig) {
        this.#runningPort = getPortNumber()
        this.#loggingEnabled = enableServerLogs()
        this.#binaryPath = getPath()
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

    async #start(): Promise<object | number | RunmeServerError> {
        const binaryExists = await fs.access(this.#binaryPath)
            .then(() => true, () => false)

        const isFile = await fs.stat(this.#binaryPath)
            .then((result) => {
                return result.isFile()
            }, () => false)

        if (!binaryExists || !isFile) {
            throw new RunmeServerError('Cannot find server binary file')
        }
        this.#process = spawn(this.#binaryPath, [
            'server',
            '--address',
            this.#address
        ])

        if (this.#loggingEnabled) {
            console.log(`Runme server process #${this.#process.pid} started`)
        }

        this.#process.on('close', () => {
            if (this.#loggingEnabled) {
                console.log(`Runme server process #${this.#process?.pid} closed`)
            }
            this.events.emit('closed')
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
