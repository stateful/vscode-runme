
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
}

class Server implements Disposable {

    #runningPort: number
    #process: ChildProcessWithoutNullStreams | undefined
    #binaryPath: string
    #retryOnFailure: boolean
    #intent: number
    #maxNumberOfIntents: number

    constructor(options: IServerConfig) {
        const config = vscode.workspace.getConfiguration('runme.server')
        this.#runningPort = config.get<number>('port')!
        this.#binaryPath = path.join(__dirname, '../', config.get<string>('binaryPath')!)
        this.#retryOnFailure = options.retryOnFailure || false
        this.#intent = 0
        this.#maxNumberOfIntents = options.maxNumberOfIntents
    }

    dispose() {
        this.#process?.removeAllListeners()
        this.#process?.kill()
    }

    async #start(): Promise<object | ServerError> {
        this.#intent ++
        if (this.#maxNumberOfIntents < this.#intent) {
            return new ServerError(`Cannot start server, reached max number of intents: ${this.#maxNumberOfIntents}`)
        }
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
                // TODO: Parse data to detect if there is any error, for now, simulating nothing failed.
                const isError = false
                if (isError) {
                    return reject(new ServerError(`Server failed, reason: ${data.toString()}`))
                }

                const msg = data.toString()
                try {
                  const log = JSON.parse(msg)
                  if ('started listening' === log?.['msg']) {
                    this.#retryOnFailure && isError ?
                        this.#start() :
                        resolve(log)
                  }
                } catch (err: any) {
                  reject(new ServerError(msg))
                }

            })
            this.#process.on('exit', (code) => reject(new ServerError(`Server ended with exit code ${code}`)))
        })
    }

    async launch(): Promise<object | ServerError> {
        return this.#start()
    }
}

export default Server
