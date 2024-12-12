import { Subject, Subscription } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { authentication, AuthenticationSessionsChangeEvent, Disposable } from 'vscode'

export default class AuthSessionChangeHandler implements Disposable {
  static #instance: AuthSessionChangeHandler | null = null

  #disposables: Disposable[] = []
  #eventSubject: Subject<AuthenticationSessionsChangeEvent>
  #subscriptions: Subscription[] = []
  #listeners: ((event: AuthenticationSessionsChangeEvent) => void)[] = []

  private constructor(private debounceTimeMs: number = 100) {
    this.#eventSubject = new Subject<AuthenticationSessionsChangeEvent>()
    this.#subscriptions.push(
      this.#eventSubject
        .pipe(distinctUntilChanged(this.eventComparer), debounceTime(this.debounceTimeMs))
        .subscribe((event) => {
          this.notifyListeners(event)
        }),
    )

    this.#disposables.push(
      authentication.onDidChangeSessions((e) => {
        this.#eventSubject.next(e)
      }),
    )
  }

  public static get instance(): AuthSessionChangeHandler {
    if (!this.#instance) {
      this.#instance = new AuthSessionChangeHandler()
    }

    return this.#instance
  }

  public addListener(listener: (event: AuthenticationSessionsChangeEvent) => void): void {
    this.#listeners.push(listener)
  }

  public removeListener(listener: (event: AuthenticationSessionsChangeEvent) => void): void {
    this.#listeners = this.#listeners.filter((l) => l !== listener)
  }

  private notifyListeners(event: AuthenticationSessionsChangeEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('Error in listener:', err)
      }
    }
  }

  private eventComparer(
    previous: AuthenticationSessionsChangeEvent,
    current: AuthenticationSessionsChangeEvent,
  ): boolean {
    return (
      previous.provider.id === current.provider.id &&
      JSON.stringify(previous) === JSON.stringify(current)
    )
  }

  public async dispose() {
    this.#disposables.forEach((d) => d.dispose())
    this.#subscriptions = []
    this.#eventSubject.complete()
    this.#listeners = []

    AuthSessionChangeHandler.#instance = null
  }
}
