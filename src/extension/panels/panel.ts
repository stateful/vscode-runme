/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Disposable,
  ExtensionContext,
  Webview,
  WebviewView,
  WebviewViewProvider,
  authentication,
} from 'vscode'
import { TelemetryViewProvider } from 'vscode-telemetry'
import { Subject, of, catchError, firstValueFrom, combineLatest, from } from 'rxjs'
import { fetch } from 'undici'
import { map, switchMap } from 'rxjs/operators'

import { AuthenticationProviders } from '../../constants'
import { getRunmeApiUrl } from '../../utils/configuration'

export type DefaultUx = 'panels'
export interface InitPayload {
  panelId: string
  appToken: string | undefined
  defaultUx: DefaultUx
}

export class PanelBase extends TelemetryViewProvider implements Disposable {
  public static readonly ALLOWED_CMDS = ['login', 'open', 'openConfig', 'openTerminal', 'addNote']
  // public appConfig: AppConfig

  protected readonly appUrl: string = 'http://localhost:3001'
  protected readonly defaultUx: DefaultUx = 'panels'

  // protected viewState: ViewState | undefined = undefined

  constructor(protected readonly context: ExtensionContext) {
    super()
    // this.appConfig = StateManager.getAppConfig()
    // this.appConfig.vscode = this.stateMgr.getExtProps()
    // this.appUrl = this.appConfig.appUrl
    // this.defaultUx = this.appConfig.appDefaultUx
  }

  public dispose() {}

  // protected useAppAuthToken(jwtAuthToken: string): Observable<AppTokenResponse> {
  //   const isVerbose = StateManager.getWorkspaceConfig<boolean>('verbose', false)
  //   const opts = { jwtAuthToken }
  //   const url = '/auth/user/app'
  //   const _withExpiry = () =>
  //     axios.post<AppTokenResponse>(url, {}, getAuthOpts(opts)).pipe(
  //       map((res) => {
  //         if (res.data?.token) {
  //           const expiry = Auth.getTokenExpiry(res.data.token)
  //           if (expiry <= 0) {
  //             throw new Error('Invalid token in response')
  //           }
  //         } else {
  //           throw new Error('No token in response')
  //         }
  //         return res
  //       }),
  //       robustRetry<AppTokenResponse>(url, { ...opts, method: 'POST' }),
  //       switchMap((res) => {
  //         return new Observable<AppTokenResponse>((observer) => {
  //           const expiry = Auth.getTokenExpiry(res.data.token!)
  //           timer(expiry - Date.now()).subscribe(() => observer.complete())
  //           if (isVerbose) {
  //             const expMinutes = Math.round((expiry - Date.now()) / 6000) / 10
  //             console.log(new Date(), `App auth token renewed (expires in ${expMinutes}min)`)
  //           }
  //           observer.next(res.data)
  //         })
  //       })
  //     )

  //   const tokenFetcher$ = new Subject<Observable<AppTokenResponse>>()
  //   return merge(of(_withExpiry()), tokenFetcher$).pipe(
  //     concatMap((fetcher) => {
  //       return fetcher.pipe(
  //         finalize(() => {
  //           if (isVerbose) {
  //             console.log(new Date(), 'App auth token expired')
  //           }
  //           return tokenFetcher$.next(_withExpiry())
  //         })
  //       )
  //     })
  //   )
  // }

  protected async getAppToken() {
    const sessionToken = authentication
      .getSession(AuthenticationProviders.GitHub, ['user:email'], {
        createIfNone: true,
      })
      .then((authSession) => authSession.accessToken)

    // todo(sebastian): needs refactor
    return fetch(`${getRunmeApiUrl()}/auth/vscode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: await sessionToken,
      }),
    })
      .then((resp) => resp.json())
      .then((vsc) => {
        const token = (vsc as any).token
        return fetch(`${getRunmeApiUrl()}/auth/user/app`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      })
      .then((resp) => resp.json())
      .then((resp) => {
        return (resp as { token: string })?.token
      })
  }

  protected hydrateHtml(html: string, payload: InitPayload) {
    let content = html
    // if (this.viewState) {
    //   payload = {
    //     ...payload,
    //     syncPayload: {
    //       onView: this.viewState,
    //     },
    //   }
    //   // reset once used
    //   this.viewState = undefined
    // }
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
  private _visible: boolean = false
  public get visible(): boolean {
    return this._visible
  }
  protected readonly html

  constructor(
    protected readonly context: ExtensionContext,
    // protected readonly stateMgr: StateManager,
    // protected readonly appToken: Observable<AppToken>,
    // protected readonly platform: Platform,
    public readonly identifier: string
  ) {
    super(context)

    this.html = fetch(this.appUrl)
  }

  async resolveWebviewTelemetryView(webviewView: WebviewView): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const webviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }

    console.log(`${this.identifier} webview resolving`)

    const html = await this.getHtml()
    webviewView.webview.html = html
    webviewView.webview.options = {
      ...webviewOptions,
      localResourceRoots: [this.context.extensionUri],
    }

    // const onDidChangeVisibility$ = new Observable<boolean>((observer) => {
    //   webviewView.onDidChangeVisibility(() => {
    //     if (webviewView.visible) {
    //       this.getHtml().then((html) => {
    //         webviewView.webview.html = html
    //       })
    //     }
    //     return observer.next(webviewView.visible)
    //   })
    //   observer.next(true)
    // })

    // onDidChangeVisibility$
    //   .pipe(
    //     startWith(this._visible),
    //     pairwise(),
    //     switchMap(([prev, curr]) => {
    //       const curr$ = of(curr)
    //       if (!prev && curr) {
    //         return curr$.pipe(delay(4000))
    //       }
    //       return curr$
    //     })
    //   )
    //   .subscribe((v) => {
    //     console.log(`switched to ${v}`)
    //     this._visible = v
    //   })

    this.webview.next(webviewView.webview)
    console.log(`${this.identifier} webview resolved`)
    return Promise.resolve()
  }

  private async getHtml(): Promise<string> {
    const appToken$ = from(this.getAppToken())
    return firstValueFrom(
      appToken$.pipe(
        switchMap((appToken) =>
          combineLatest([of(appToken), from(this.html.then((r) => r.text()))])
        ),
        map(([appToken, html]) => {
          return this.hydrateHtml(html, {
            panelId: this.identifier,
            appToken,
            defaultUx: this.defaultUx,
          })
        }),
        catchError((err) => {
          console.error(err)
          throw err
        })
      )
    )
  }
}
