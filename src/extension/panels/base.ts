import { Disposable, ExtensionContext, Webview, WebviewViewProvider } from 'vscode'
import { TelemetryViewProvider } from 'vscode-telemetry'
import { Observable, Subscription, Subject } from 'rxjs'

import { type SyncSchemaBus } from '../../types'

export interface IPanel extends WebviewViewProvider {
  webview: Subject<Webview>
  getBus(): SyncSchemaBus | undefined
  registerBus(bus$: Observable<SyncSchemaBus>): void
  dispose(): void
}

export abstract class TanglePanel
  extends TelemetryViewProvider
  implements Disposable, WebviewViewProvider
{
  public readonly webview = new Subject<Webview>()
  public readonly identifier: string
  protected bus$?: SyncSchemaBus

  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
  ) {
    super()
    this.identifier = identifier
  }

  protected abstract registerSubscribers(bus: SyncSchemaBus): Subscription[]

  public registerBus(bus$: Observable<SyncSchemaBus>) {
    bus$.subscribe((bus) => {
      this.bus$ = bus
      const subs: Subscription[] = this.registerSubscribers(bus)

      return () => {
        subs.forEach((s) => s.unsubscribe())
      }
    })
  }

  public getBus() {
    return this.bus$
  }

  public dispose() {
    this.webview.complete()
  }
}
