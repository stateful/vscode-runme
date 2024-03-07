import { EventEmitter } from 'node:events'

import { Disposable } from 'vscode'

import { StoredEnvVar } from '../../types'

export default class EnvVarsChangedEvent implements Disposable {
  #eventEmitter: EventEmitter | undefined
  #eventName = 'envVarsChanged'
  constructor() {
    this.#eventEmitter = new EventEmitter()
  }

  getEvent() {
    console.log('returning event emitter', this.#eventEmitter)
    return this.#eventEmitter
  }

  getEventName() {
    return this.#eventName
  }

  dispatch(envVars: StoredEnvVar[]) {
    console.log('emit event', this.#eventName)
    this.#eventEmitter?.emit(this.#eventName, envVars)
  }

  dispose() {
    this.#eventEmitter?.removeAllListeners(this.#eventName)
  }
}
