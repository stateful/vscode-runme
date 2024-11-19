import { ExtensionContext, WebviewView, window, ColorThemeKind, Uri, env } from 'vscode'
import { from } from 'rxjs'
import { take, withLatestFrom } from 'rxjs/operators'

import { fetchStaticHtml, resolveAppToken } from '../utils'
import { IAppToken } from '../services/runme'
import { getRunmeAppUrl, getRunmePanelIdentifier } from '../../utils/configuration'
import getLogger from '../logger'
import { type SyncSchemaBus } from '../../types'
import archiveCell from '../services/archiveCell'
import unArchiveCell from '../services/unArchiveCell'

import { TanglePanel } from './base'

export type DefaultUx = 'panels'
export interface InitPayload {
  ide: 'code'
  panelId: string
  appToken: string | null
  defaultUx: DefaultUx
  themeKind: ColorThemeKind
}

const log = getLogger('CloudPanel')

export default class CloudPanel extends TanglePanel {
  protected readonly appUrl: string = getRunmeAppUrl(['app'])
  protected readonly defaultUx: DefaultUx = 'panels'

  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
  ) {
    super(context, getRunmePanelIdentifier(identifier))
  }

  public async getAppToken(createIfNone: boolean = true): Promise<IAppToken | null> {
    return resolveAppToken(createIfNone)
  }

  public hydrateHtml(html: string, payload: InitPayload) {
    let content = html
    // eslint-disable-next-line quotes
    content = html.replace(`'{ "appToken": null }'`, `'${JSON.stringify(payload)}'`)
    content = content.replace(
      '<script id="appAuthToken">',
      `<base href="${this.appUrl}"><script id="appAuthToken">`,
    )
    return content
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    log.trace(`${this.identifier} webview resolving`)

    const html = await this.getHydratedHtml()
    webviewView.webview.html = html
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [this.context.extensionUri],
    }

    this.webview.next(webviewView.webview)
    log.trace(`${this.identifier} webview resolved`)
    return Promise.resolve()
  }

  private async getHydratedHtml(): Promise<string> {
    let appToken: string | null
    let staticHtml: string
    try {
      appToken = await this.getAppToken(false).then((appToken) => appToken?.token ?? null)
    } catch (err: any) {
      log.error(err?.message || err)
      appToken = null
    }
    try {
      staticHtml = await fetchStaticHtml(this.appUrl).then((r) => r.text())
    } catch (err: any) {
      log.error(err?.message || err)
      throw err
    }
    return this.hydrateHtml(staticHtml, {
      ide: 'code',
      panelId: this.identifier,
      appToken: appToken ?? 'EMPTY',
      defaultUx: this.defaultUx,
      themeKind: window.activeColorTheme.kind,
    })
  }

  protected registerSubscribers(bus: SyncSchemaBus) {
    return [
      bus.on('onCommand', (cmdEvent) => {
        if (cmdEvent?.name === 'signIn') {
          this.onSignIn(bus)
        } else if (cmdEvent?.name === 'signOut') {
          this.onSignOut(bus)
        }
      }),
      bus.on('onArchiveCell', async (cmdEvent) => {
        const answer = await window.showInformationMessage(
          'Are you sure you want to archive this cell?',
          'Yes',
          'No',
        )

        try {
          if (answer === 'Yes') {
            await archiveCell(cmdEvent?.cellId!)
            window.showInformationMessage('The cell has been archived!')
            bus.emit('onCellArchived', {
              cellId: cmdEvent?.cellId!,
            })
          }
        } catch (error) {
          await window.showErrorMessage(`Failed to archive cell: ${(error as any).message}`)
        }
      }),
      bus.on('onUnArchiveCell', async (cmdEvent) => {
        const answer = await window.showInformationMessage(
          'Are you sure you want to restore this cell?',
          'Yes',
          'No',
        )

        try {
          if (answer === 'Yes') {
            await unArchiveCell(cmdEvent?.cellId!)
            window.showInformationMessage('The cell has been restored!')
            bus.emit('onCellUnArchived', {
              cellId: cmdEvent?.cellId!,
            })
          }
        } catch (error) {
          await window.showErrorMessage(`Failed to restore cell: ${(error as any).message}`)
        }
      }),
      bus.on('onSiteOpen', async (cmdEvent) => {
        if (!cmdEvent?.url) {
          return
        }
        env.openExternal(Uri.parse(cmdEvent?.url))
      }),
    ]
  }

  // unnest existing type would be cleaner
  private async onSignIn(bus: SyncSchemaBus) {
    try {
      const appToken = await this.getAppToken(true)
      bus.emit('onAppToken', appToken!)
      from(this.getHydratedHtml())
        .pipe(withLatestFrom(this.webview), take(1))
        .subscribe(([html, recentWebview]) => {
          recentWebview.html = html
        })
    } catch (err: any) {
      log.error(err?.message || err)
    }
  }

  private async onSignOut(bus: SyncSchemaBus) {
    try {
      bus.emit('onAppToken', { token: 'EMPTY' })
      from(this.getHydratedHtml())
        .pipe(withLatestFrom(this.webview), take(1))
        .subscribe(([html, recentWebview]) => {
          recentWebview.html = html
        })
    } catch (err: any) {
      log.error(err?.message || err)
    }
  }
}
