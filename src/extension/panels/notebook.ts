import { Subscription, Observable, combineLatest } from 'rxjs'
import { Disposable, EventEmitter, ExtensionContext, Uri, Webview, WebviewView } from 'vscode'

import { SnapshotEnv, SyncSchemaBus } from '../../types'
import getLogger from '../logger'
import EnvVarsChangedEvent from '../events/envVarsChanged'

import { TanglePanel } from './base'

const log = getLogger('NotebookPanel')
export class NotebookPanel extends TanglePanel {
  #variables: SnapshotEnv[] | undefined
  #webviewView: WebviewView | undefined
  #disposables: Disposable[] = []
  #webviewObservable$: Observable<WebviewView>
  #webviewReadyEvent: EventEmitter<WebviewView>
  #subscriptions$: Subscription
  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
    protected onEnvVarsChangedEvent: EnvVarsChangedEvent,
  ) {
    super(context, identifier)
    this.#variables = []
    this.#disposables.push(this.onEnvVarsChangedEvent)
    this.#webviewReadyEvent = new EventEmitter()
    this.#webviewObservable$ = new Observable((subscription) => {
      const listener = (value: WebviewView) => subscription.next(value)
      this.#webviewReadyEvent.event(listener)
    })

    this.#subscriptions$ = combineLatest([
      this.#webviewObservable$,
      this.onEnvVarsChangedEvent.getObservable(),
    ]).subscribe(([, envVars]) => {
      this.updateWebview(envVars)
    })
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    const { webview } = webviewView
    this.#webviewView = webviewView
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    log.trace(`${this.identifier} webview resolving`)

    const extensionUri = this.context.extensionUri

    webviewView.webview.html = this.getHtml(webview, extensionUri, this.#variables!)
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [extensionUri],
    }

    webviewView.onDidDispose(this.onDidDispose)

    this.webview.next(webviewView.webview)
    this.#webviewReadyEvent.fire(webviewView)
    log.trace(`${this.identifier} webview resolved`)

    return Promise.resolve()
  }

  private sanitizeVariables(variables: SnapshotEnv[]) {
    variables.forEach((variable: SnapshotEnv) => {
      variable.originalValue = variable.originalValue.replace(/'/g, '&#39;')
    })
    return variables
  }

  private getHtml(webview: Webview, extensionUri: Uri, variables: SnapshotEnv[]) {
    const scripts = [
      {
        src: NotebookPanel.getUri(webview, extensionUri, ['out', 'client.js']),
        defer: true,
      },
    ]
    const scriptTags = scripts.map((s) => {
      if (s.defer) {
        return `<script src="${s.src}" type="module"></script>`
      } else {
        return `<script src="${s.src}" type="module" defer></script>`
      }
    })
    return `<!DOCTYPE html><html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Panel</title>
      ${scriptTags}
    </head>
    <body>
    <env-store variables='${JSON.stringify(this.sanitizeVariables(variables))}'></env-store>
    </body>
  </html>`
  }

  private updateWebview(vars: SnapshotEnv[]) {
    // console.log('updating webview', this.#webviewView, this.#webviewView?.webview)
    this.#webviewView!.webview.html = this.getHtml(
      this.#webviewView!.webview,
      this.context.extensionUri,
      vars,
    )
  }

  private static getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
  }

  private onDidDispose() {
    this.#disposables.forEach((disposable) => disposable.dispose())
    this.#subscriptions$.unsubscribe()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected registerSubscribers(bus: SyncSchemaBus): Subscription[] {
    return []
  }
}
