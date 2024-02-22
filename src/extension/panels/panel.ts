import {
  Disposable,
  ExtensionContext,
  Webview,
  WebviewView,
  WebviewViewProvider,
  window,
  ColorThemeKind,
} from 'vscode'
import { TelemetryViewProvider } from 'vscode-telemetry'
import { Subject } from 'rxjs'
import { Observable, Subscription } from 'rxjs'

import { fetchStaticHtml, resolveAppToken } from '../utils'
import { IAppToken } from '../services/runme'
import { type SyncSchemaBus } from '../../types'
import { getRunmeAppUrl, getRunmePanelIdentifier } from '../../utils/configuration'
import archiveCell from '../services/archiveCell'

export type DefaultUx = 'panels'
export interface InitPayload {
  ide: 'code'
  panelId: string
  appToken: string | null
  defaultUx: DefaultUx
  themeKind: ColorThemeKind
}

class PanelBase extends TelemetryViewProvider implements Disposable {
  protected readonly appUrl: string = getRunmeAppUrl(['app'])
  protected readonly defaultUx: DefaultUx = 'panels'

  constructor(protected readonly context: ExtensionContext) {
    super()
  }

  public dispose() {}

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
}

export default class Panel extends PanelBase implements WebviewViewProvider {
  public readonly webview = new Subject<Webview>()
  public readonly identifier: string
  private bus$?: SyncSchemaBus

  constructor(
    protected readonly context: ExtensionContext,
    identifier: string,
  ) {
    super(context)
    this.identifier = getRunmePanelIdentifier(identifier)
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    console.log(`${this.identifier} webview resolving`)

    const html = await this.getHydratedHtml()
    webviewView.webview.html = html
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [this.context.extensionUri],
    }

    this.webview.next(webviewView.webview)
    console.log(`${this.identifier} webview resolved`)
    return Promise.resolve()
  }

  private async getHydratedHtml(): Promise<string> {
    let appToken: string | null
    let staticHtml: string
    try {
      appToken = await this.getAppToken(false).then((appToken) => appToken?.token ?? null)
      staticHtml = await fetchStaticHtml(this.appUrl).then((r) => r.text())
    } catch (err: any) {
      console.error(err?.message || err)
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

  // unnest existing type would be cleaner
  private async onSignIn(bus: SyncSchemaBus) {
    try {
      const appToken = await this.getAppToken(true)
      bus.emit('onAppToken', appToken!)
    } catch (err: any) {
      console.error(err?.message || err)
    }
  }

  public getBus() {
    return this.bus$
  }

  public registerBus(bus$: Observable<SyncSchemaBus>) {
    bus$.subscribe((bus) => {
      this.bus$ = bus
      const subs: Subscription[] = [
        bus.on('onCommand', (cmdEvent) => {
          if (cmdEvent?.name !== 'signIn') {
            return
          }
          this.onSignIn(bus)
        }),
        bus.on('onArchiveCell', async (cmdEvent) => {
          const answer = await window.showInformationMessage(
            'Are you sure you want to archive this cell?',
            'Yes',
            'No',
          )

          try {
            if (answer === 'Yes') {
              bus.emit('onCellArchived', {
                cellId: cmdEvent?.cellId!,
              })
              await archiveCell(cmdEvent?.cellId!)
              await window.showInformationMessage('The cell has been archived!')
            }
          } catch (error) {
            await window.showErrorMessage(`Failed to archive cell: ${(error as any).message}`)
          }
        }),
      ]

      return () => {
        subs.forEach((s) => s.unsubscribe())
      }
    })
  }
}
