import { Subscription } from 'rxjs'
import { Disposable, ExtensionContext, Uri, Webview, WebviewView } from 'vscode'

import { StoredEnvVar, SyncSchemaBus } from '../../types'
import getLogger from '../logger'
import EnvVarsChangedEvent from '../events/envVarsChanged'

import { TanglePanel } from './base'

const log = getLogger('NotebookPanel')
export class NotebookPanel extends TanglePanel {
  #variables: StoredEnvVar[] | undefined
  #webviewView: WebviewView | undefined
  #disposables: Disposable[] = []
  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
    variables: StoredEnvVar[] | undefined,
    protected onEnvVarsChangedEvent: EnvVarsChangedEvent,
  ) {
    super(context, identifier)
    this.#variables = variables
    this.#disposables.push(this.onEnvVarsChangedEvent)
    this.onEnvVarsChangedEvent
      .getEvent()
      ?.on(this.onEnvVarsChangedEvent.getEventName(), (envVars: StoredEnvVar[]) => {
        this.updteWebview(envVars)
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
    log.trace(`${this.identifier} webview resolved`)

    return Promise.resolve()
  }

  private getHtml(webview: Webview, extensionUri: Uri, variables: StoredEnvVar[]) {
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
    <env-store variables='${JSON.stringify(variables)}'></env-store>
    </body>
  </html>`
  }

  private updteWebview(vars: StoredEnvVar[]) {
    console.log('updating webview')
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
    console.log('disposing')
    this.#disposables.forEach((disposable) => disposable.dispose())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected registerSubscribers(bus: SyncSchemaBus): Subscription[] {
    return []
  }
}
