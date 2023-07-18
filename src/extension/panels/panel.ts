import { Disposable, ExtensionContext, Webview, WebviewView, WebviewViewProvider } from 'vscode'
import { TelemetryViewProvider } from 'vscode-telemetry'
import { Subject } from 'rxjs'
import { Observable, Subscription } from 'rxjs'

import { fetchStaticHtml, getAuthSession } from '../utils'
import { IAppToken, RunmeService } from '../services/runme'
import { SyncSchemaBus } from '../../types'

export type DefaultUx = 'panels'
export interface InitPayload {
  ide: 'code'
  panelId: string
  appToken: string | null
  defaultUx: DefaultUx
}

class PanelBase extends TelemetryViewProvider implements Disposable {
  protected readonly appUrl: string = 'http://localhost:3001'
  protected readonly defaultUx: DefaultUx = 'panels'

  constructor(protected readonly context: ExtensionContext) {
    super()
  }

  public dispose() {}

  public async getAppToken(createIfNone: boolean = true): Promise<IAppToken | null> {
    const session = await getAuthSession(createIfNone)

    if (session) {
      const service = new RunmeService({ githubAccessToken: session.accessToken })
      const userToken = await service.getUserToken()
      return await service.getAppToken(userToken)
    }

    return null
  }

  public hydrateHtml(html: string, payload: InitPayload) {
    let content = html
    // eslint-disable-next-line quotes
    content = html.replace(`'{ "appToken": null }'`, `'${JSON.stringify(payload)}'`)
    content = content.replace(
      '<script id="appAuthToken">',
      `<base href="${this.appUrl}"><script id="appAuthToken">`
    )
    return content
  }
}

export default class Panel extends PanelBase implements WebviewViewProvider {
  public readonly webview = new Subject<Webview>()
  protected readonly staticHtml

  constructor(protected readonly context: ExtensionContext, public readonly identifier: string) {
    super(context)

    this.staticHtml = fetchStaticHtml(this.appUrl)
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
      staticHtml = await this.staticHtml.then((r) => r.text())
    } catch (err: any) {
      console.error(err?.message || err)
      throw err
    }
    return this.hydrateHtml(staticHtml, {
      ide: 'code',
      panelId: this.identifier,
      appToken: appToken ?? 'EMPTY',
      defaultUx: this.defaultUx,
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

  public registerBus(bus$: Observable<SyncSchemaBus>) {
    bus$.subscribe((bus) => {
      const subs: Subscription[] = [
        bus.on('onCommand', (cmdEvent) => {
          if (cmdEvent?.name !== 'signIn') {
            return
          }
          this.onSignIn(bus)
        }),
      ]

      return () => {
        subs.forEach((s) => s.unsubscribe())
      }
    })
  }
}
