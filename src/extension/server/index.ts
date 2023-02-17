
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'

import vscode, { Disposable } from 'vscode'

import { SERVER_ADDRESS } from '../../constants'

import ServerError from './serverError'

export interface IServerConfig {
    assignPortDynamically?: boolean
    retryOnFailure?: boolean
    maxNumberOfIntents: number
    onServerDidExit?(exitCode: number): void
}

class Server implements Disposable {

    #runningPort: number
    #process: ChildProcessWithoutNullStreams | undefined
    #binaryPath: string
    #retryOnFailure: boolean
    #intent: number
    #maxNumberOfIntents: number
    onServerDidExit?(exitCode: number | null): void

    constructor(options: IServerConfig) {
        const config = vscode.workspace.getConfiguration('runme.server')
        this.#runningPort = config.get<number>('port')!
        this.#binaryPath = path.join(__dirname, '../', config.get<string>('binaryPath')!)
        this.#retryOnFailure = options.retryOnFailure || false
        this.#intent = 0
        this.#maxNumberOfIntents = options.maxNumberOfIntents
        this.onServerDidExit = options.onServerDidExit
    }

    dispose() {
        this.#process?.removeAllListeners()
        this.#process?.kill()
    }

    async #start(): Promise<object | number | ServerError> {
        const binaryExists = await fs.access(this.#binaryPath)
            .then(() => true, () => false)
        if (!binaryExists) {
            throw new ServerError('Cannot find server binary file')
        }
        return new Promise((resolve, reject) => {
            this.#process = spawn(this.#binaryPath, [
                'server',
                '--address',
                `${SERVER_ADDRESS}:${this.#runningPort}`
            ])
            this.#process.stderr.on('data', (data) => {
                const msg = data.toString()
                try {
                    const log = JSON.parse(msg)
                    if ('started listening' === log?.['msg']) {
                        resolve(log)
                    }
                } catch (err: any) {
                    reject(new ServerError(`Server failed, reason: ${msg || (err as Error).message}`))
                }
            })
            this.#process.on('exit', (code) => this.onServerDidExit ? this.onServerDidExit(code) : undefined)
        })
    }

    async launch(): Promise<object | number | ServerError> {
        try {
            return await this.#start()
        } catch (e) {
            if (this.#retryOnFailure && this.#maxNumberOfIntents > this.#intent) {
                this.#intent ++
                return this.launch()
            }
            throw new ServerError(`Cannot start server. Error: ${(e as Error).message}`)
        }
    }
}

export default Server
