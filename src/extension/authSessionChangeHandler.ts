import { Subject, Subscription } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { authentication, AuthenticationSessionsChangeEvent, ExtensionContext } from 'vscode'

export default class AuthSessionChangeHandler {
  private static _instance: AuthSessionChangeHandler | null = null

  private eventSubject: Subject<AuthenticationSessionsChangeEvent>
  private subscriptions: Subscription[] = []
  private listeners: ((event: AuthenticationSessionsChangeEvent) => void)[] = []
  private initialized = false
  // private isProcessing = false

  private constructor(private debounceTimeMs: number = 500) {
    this.eventSubject = new Subject<AuthenticationSessionsChangeEvent>()
  }

  public static get instance(): AuthSessionChangeHandler {
    if (!this._instance) {
      this._instance = new AuthSessionChangeHandler()
    }
    return this._instance
  }

  public initialize(context: ExtensionContext): void {
    if (this.initialized) {
      console.warn('AuthSessionChangeHandler is already initialized.')
      return
    }
    this.initialized = true

    this.subscriptions.push(
      this.eventSubject
        .pipe(distinctUntilChanged(this.eventComparer), debounceTime(this.debounceTimeMs))
        .subscribe((event) => {
          this.notifyListeners(event)
        }),
    )

    // this.subscriptions.push(
    //   this.eventSubject
    //     .pipe(
    //       filter(() => !this.isProcessing),
    //       take(1),
    //     )
    //     .subscribe((event) => {
    //       this.isProcessing = true
    //       this.notifyListeners(event)

    //       setTimeout(() => {
    //         this.isProcessing = false
    //       }, 0)
    //     }),
    // )

    context.subscriptions.push(
      authentication.onDidChangeSessions((e) => {
        console.log(`******* authentication.onDidChangeSessions ${e.provider.id}`)
        this.eventSubject.next(e)
      }),
    )

    context.subscriptions.push({
      dispose: () => this.dispose(),
    })
  }

  public addListener(listener: (event: AuthenticationSessionsChangeEvent) => void): void {
    if (!this.initialized) {
      throw new Error('AuthSessionChangeHandler is not initialized.')
    }
    this.listeners.push(listener)
  }

  public removeListener(listener: (event: AuthenticationSessionsChangeEvent) => void): void {
    if (!this.initialized) {
      throw new Error('AuthSessionChangeHandler is not initialized.')
    }
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  private notifyListeners(event: AuthenticationSessionsChangeEvent): void {
    for (const listener of this.listeners) {
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

  public dispose(): void {
    if (!this.initialized) {
      return
    }
    this.initialized = false

    for (const subscription of this.subscriptions) {
      subscription.unsubscribe()
    }
    this.subscriptions = []
    this.eventSubject.complete()
    this.listeners = []
    AuthSessionChangeHandler._instance = null
  }
}
