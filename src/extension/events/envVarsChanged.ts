import { Disposable, EventEmitter } from 'vscode'

import { SnapshotEnv } from '../../types'

export default class EnvVarsChangedEvent implements Disposable {
  #eventEmitter: EventEmitter<SnapshotEnv[]> | undefined
  constructor() {
    this.#eventEmitter = new EventEmitter()
  }

  getEvent() {
    console.log('returning event emitter', this.#eventEmitter)
    return this.#eventEmitter
  }

  dispatch(envVars: SnapshotEnv[]) {
    this.#eventEmitter?.fire(envVars)
  }

  dispose() {
    this.#eventEmitter?.dispose()
  }
}
