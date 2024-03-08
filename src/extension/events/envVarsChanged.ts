import { Disposable, EventEmitter } from 'vscode'
import { Observable } from 'rxjs'

import { SnapshotEnv } from '../../types'

export default class EnvVarsChangedEvent implements Disposable {
  #eventEmitter: EventEmitter<SnapshotEnv[]> | undefined
  #observableEventEmitter$: Observable<SnapshotEnv[]>
  constructor() {
    this.#eventEmitter = new EventEmitter()
    this.#observableEventEmitter$ = new Observable<SnapshotEnv[]>((subscriber) => {
      const listener = (value: SnapshotEnv[]) => subscriber.next(value)
      this.#eventEmitter?.event(listener)
    })
  }

  getEvent() {
    return this.#eventEmitter
  }

  dispatch(envVars: SnapshotEnv[]) {
    this.#eventEmitter?.fire(envVars)
  }

  getObservable() {
    return this.#observableEventEmitter$
  }

  dispose() {
    this.#eventEmitter?.dispose()
  }
}
