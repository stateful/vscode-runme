import { Subscription } from 'rxjs'
import { ExtensionContext, Uri, Webview, WebviewView } from 'vscode'

import { StoredEnvVar, SyncSchemaBus } from '../../types'
import getLogger from '../logger'

import { TanglePanel } from './base'

const log = getLogger('NotebookPanel')

export class NotebookPanel extends TanglePanel {
  #variables: StoredEnvVar[] | undefined
  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
    variables: StoredEnvVar[] | undefined,
  ) {
    super(context, identifier)
    this.#variables = variables
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    const { webview } = webviewView
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    log.trace(`${this.identifier} webview resolving`)

    const extensionUri = this.context.extensionUri
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
    const html = `<!DOCTYPE html><html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Panel</title>
        ${scriptTags}
      </head>
      <body>
      <env-store variables='${JSON.stringify(this.#variables)}'></env-store>
      </body>
    </html>`

    webviewView.webview.html = html
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [extensionUri],
    }

    this.webview.next(webviewView.webview)
    log.trace(`${this.identifier} webview resolved`)
    return Promise.resolve()
  }

  private static getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected registerSubscribers(bus: SyncSchemaBus): Subscription[] {
    return []
  }
}
