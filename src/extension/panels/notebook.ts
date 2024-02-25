import { Subscription } from 'rxjs'
import { ExtensionContext, WebviewView } from 'vscode'

import { SyncSchemaBus } from '../../types'
import getLogger from '../logger'

import { TanglePanel } from './base'

const log = getLogger('NotebookPanel')

export class NotebookPanel extends TanglePanel {
  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
  ) {
    super(context, identifier)
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    log.trace(`${this.identifier} webview resolving`)

    const html =
      '<!DOCTYPE html><html><head><title>Notebook</title></head><body><h3>Smart Env Store</h3></body></html>'
    webviewView.webview.html = html
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [this.context.extensionUri],
    }

    this.webview.next(webviewView.webview)
    log.trace(`${this.identifier} webview resolved`)
    return Promise.resolve()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected registerSubscribers(bus: SyncSchemaBus): Subscription[] {
    return []
  }
}
