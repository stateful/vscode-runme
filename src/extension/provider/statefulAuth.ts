import * as crypto from 'node:crypto'

import {
  authentication,
  AuthenticationProvider,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  AuthenticationSession,
  Disposable,
  env,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  Uri,
  window,
} from 'vscode'
import { v4 as uuid } from 'uuid'
import fetch from 'node-fetch'

import { PromiseAdapter, promiseFromEvent } from '../util'
import { getIdpConfig, getRunmeAppUrl } from '../../utils/configuration'
import { AuthenticationProviders } from '../../constants'

const AUTH_NAME = 'Stateful'

const SESSIONS_SECRET_KEY = `${AuthenticationProviders.Stateful}.sessions`

let remoteOutput = window.createOutputChannel('stateful')

interface TokenInformation {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface StatefulAuthSession extends AuthenticationSession {
  refreshToken: string
  expiresIn: number
}

export class StatefulAuthProvider implements AuthenticationProvider, Disposable {
  private _sessionChangeEmitter =
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>()
  private _disposable: Disposable
  private _pendingStates: string[] = []
  private _codeExchangePromises = new Map<
    string,
    { promise: Promise<TokenInformation>; cancel: EventEmitter<void> }
  >()
  private _codeVerfifiers = new Map<string, string>()
  private _scopes = new Map<string, string[]>()
  private _uriHandler: any

  constructor(
    private readonly context: ExtensionContext,
    uriHandler: any,
  ) {
    this._uriHandler = uriHandler
    this._disposable = Disposable.from(
      authentication.registerAuthenticationProvider(
        AuthenticationProviders.Stateful,
        AUTH_NAME,
        this,
        {
          supportsMultipleAccounts: false,
        },
      ),
    )
  }

  get onDidChangeSessions() {
    return this._sessionChangeEmitter.event
  }

  get redirectUri() {
    const publisher = this.context.extension.packageJSON.publisher
    const name = this.context.extension.packageJSON.name

    let callbackUrl = `${env.uriScheme}://${publisher}.${name}`
    return callbackUrl
  }

  /**
   * Get the existing sessions
   * @param scopes
   * @returns
   */
  public async getSessions(scopes?: string[]): Promise<readonly StatefulAuthSession[]> {
    try {
      const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY)
      if (!allSessions) {
        return []
      }

      const sessions = JSON.parse(allSessions) as StatefulAuthSession[]
      if (!sessions.length) {
        return []
      }

      // Get all required scopes
      const allScopes = this.getScopes(scopes || []) as string[]

      if (allScopes.length) {
        if (!scopes?.length) {
          return sessions
        }

        const session = sessions.find((s) => scopes.every((scope) => s.scopes.includes(scope)))
        if (!session) {
          return []
        }

        if (this.isTokenNotExpired(session.expiresIn)) {
          // Emit a 'session changed' event to notify that the token has been accessed.
          // This ensures that any components listening for session changes are notified appropriately.
          this._sessionChangeEmitter.fire({ added: [], removed: [], changed: [session] })
          return [session]
        }

        const refreshToken = session.refreshToken
        const { idpClientId } = getIdpConfig()
        const token = await this.getAccessToken(refreshToken, idpClientId)
        const { access_token, refresh_token, expires_in } = token

        if (access_token) {
          const updatedSession = {
            ...session,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: secsToUnixTime(expires_in),
            scopes: scopes,
          }

          this.updateSession(updatedSession)
          return [updatedSession]
        } else {
          this.removeSession(session.id)
        }
      }
    } catch (e) {
      // Nothing to do
    }

    return []
  }

  /**
   * Create a new auth session
   * @param scopes
   * @returns
   */
  public async createSession(scopes: string[]): Promise<StatefulAuthSession> {
    try {
      const { access_token, refresh_token, expires_in } = await this.login(scopes)
      if (!access_token) {
        throw new Error('Stateful login failure')
      }

      const userinfo: { name: string; email: string } = await this.getUserInfo(access_token)

      const session: StatefulAuthSession = {
        id: uuid(),
        expiresIn: secsToUnixTime(expires_in),
        accessToken: access_token,
        refreshToken: refresh_token,
        account: {
          label: userinfo.name,
          id: userinfo.email,
        },
        scopes: this.getScopes(scopes),
      }

      await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify([session]))

      this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] })

      return session
    } catch (e) {
      window.showErrorMessage(`Sign in failed: ${e}`)
      throw e
    }
  }

  /**
   * Update an existing session
   * @param session
   */
  private async updateSession(session: StatefulAuthSession): Promise<void> {
    const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY)

    if (allSessions) {
      let sessions = JSON.parse(allSessions) as AuthenticationSession[]
      const sessionIdx = sessions.findIndex((s) => s.id === session.id)

      sessions.splice(sessionIdx, 1)
      sessions.push(session)

      await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions))

      if (session) {
        this._sessionChangeEmitter.fire({ added: [], removed: [], changed: [session] })
      }
    }
  }

  /**
   * Remove an existing session
   * @param sessionId
   */
  public async removeSession(sessionId: string): Promise<void> {
    const allSessions = await this.context.secrets.get(SESSIONS_SECRET_KEY)
    if (allSessions) {
      let sessions = JSON.parse(allSessions) as AuthenticationSession[]
      const sessionIdx = sessions.findIndex((s) => s.id === sessionId)
      const session = sessions[sessionIdx]
      sessions.splice(sessionIdx, 1)

      await this.context.secrets.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions))

      if (session) {
        this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] })
      }
    }
  }

  /**
   * Dispose the registered services
   */
  public async dispose() {
    this._disposable.dispose()
  }

  /**
   * Log in to Stateful
   */
  private async login(scopes: string[] = []): Promise<TokenInformation> {
    return await window.withProgress<TokenInformation>(
      {
        location: ProgressLocation.Notification,
        title: 'Signing in to Stateful...',
        cancellable: true,
      },
      async (_, token) => {
        const nonceId = uuid()

        const scopeString = scopes.join(' ')

        // Retrieve all required scopes
        scopes = this.getScopes(scopes)

        const codeVerifier = toBase64UrlEncoding(crypto.randomBytes(32))
        const codeChallenge = toBase64UrlEncoding(sha256(codeVerifier))

        let callbackUri = await env.asExternalUri(Uri.parse(this.redirectUri))

        remoteOutput.appendLine(`Callback URI: ${callbackUri.toString(true)}`)

        const callbackQuery = new URLSearchParams(callbackUri.query)
        const stateId = callbackQuery.get('state') || nonceId

        remoteOutput.appendLine(`State ID: ${stateId}`)
        remoteOutput.appendLine(`Nonce ID: ${nonceId}`)

        callbackQuery.set('state', encodeURIComponent(stateId))
        callbackQuery.set('nonce', encodeURIComponent(nonceId))
        callbackUri = callbackUri.with({
          query: callbackQuery.toString(),
        })

        this._pendingStates.push(stateId)
        this._codeVerfifiers.set(stateId, codeVerifier)
        this._scopes.set(stateId, scopes)
        const { idpClientId, idpDomain, idpAudience } = getIdpConfig()

        const searchParams = new URLSearchParams([
          ['response_type', 'code'],
          ['client_id', idpClientId],
          ['redirect_uri', `${getRunmeAppUrl(['platform'])}ide-callback`],
          ['state', encodeURIComponent(callbackUri.toString(true))],
          ['scope', scopes.join(' ')],
          ['prompt', 'login'],
          ['code_challenge_method', 'S256'],
          ['code_challenge', codeChallenge],
          ['audience', idpAudience],
        ])
        const uri = Uri.parse(`https://${idpDomain}/authorize?${searchParams.toString()}`)

        remoteOutput.appendLine(`Login URI: ${uri.toString(true)}`)

        await env.openExternal(uri)

        let codeExchangePromise = this._codeExchangePromises.get(scopeString)
        if (!codeExchangePromise) {
          codeExchangePromise = promiseFromEvent(this._uriHandler.event, this.handleUri(scopes))
          this._codeExchangePromises.set(scopeString, codeExchangePromise)
        }

        try {
          return await Promise.race([
            codeExchangePromise.promise,
            new Promise<string>((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
            promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => {
              reject('User Cancelled')
            }).promise,
          ])
        } finally {
          this._pendingStates = this._pendingStates.filter((n) => n !== stateId)
          codeExchangePromise?.cancel.fire()
          this._codeExchangePromises.delete(scopeString)
          this._codeVerfifiers.delete(stateId)
          this._scopes.delete(stateId)
        }
      },
    )
  }

  /**
   * Handle the redirect to VS Code (after sign in from Staeful)
   * @param scopes
   * @returns
   */
  private handleUri: (scopes: readonly string[]) => PromiseAdapter<Uri, TokenInformation> =
    (_scopes) => async (uri, resolve, reject) => {
      const query = new URLSearchParams(uri.query)
      const code = query.get('code')
      const stateId = query.get('state')

      if (!code) {
        reject(new Error('No code'))
        return
      }
      if (!stateId) {
        reject(new Error('No state'))
        return
      }

      const codeVerifier = this._codeVerfifiers.get(stateId)
      if (!codeVerifier) {
        reject(new Error('No code verifier'))
        return
      }

      // Check if it is a valid auth request started by the extension
      if (!this._pendingStates.some((n) => n === stateId)) {
        reject(new Error('State not found'))
        return
      }

      const { idpClientId, idpDomain } = getIdpConfig()

      const postData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: idpClientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${getRunmeAppUrl(['platform'])}ide-callback`,
      }).toString()

      const response = await fetch(`https://${idpDomain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length.toString(),
        },
        body: postData,
      })

      const { access_token, refresh_token, expires_in } = await response.json()

      resolve({
        access_token,
        refresh_token,
        expires_in,
      })
    }

  /**
   * Get the user info from Stateful
   * @param token
   * @returns
   */
  private async getUserInfo(token: string) {
    const { idpDomain } = getIdpConfig()

    const response = await fetch(`https://${idpDomain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return await response.json()
  }

  /**
   * Get all required scopes
   * @param scopes
   */
  private getScopes(scopes: string[] = []): string[] {
    let modifiedScopes = [...scopes]

    if (!modifiedScopes.includes('offline_access')) {
      modifiedScopes.push('offline_access')
    }
    if (!modifiedScopes.includes('openid')) {
      modifiedScopes.push('openid')
    }
    if (!modifiedScopes.includes('profile')) {
      modifiedScopes.push('profile')
    }
    if (!modifiedScopes.includes('email')) {
      modifiedScopes.push('email')
    }

    return modifiedScopes.sort()
  }

  /**
   * Retrieve a new access token by the refresh token
   * @param refreshToken
   * @param clientId
   * @returns
   */
  private async getAccessToken(refreshToken: string, clientId: string): Promise<TokenInformation> {
    const { idpDomain } = getIdpConfig()
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }).toString()

    const response = await fetch(`https://${idpDomain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length.toString(),
      },
      body: postData,
    })

    const { access_token, refresh_token, expires_in } = await response.json()
    return { access_token, refresh_token, expires_in }
  }

  /**
   * Checks if the token is not expired, considering it invalid one hour before its actual expiration time.
   * This validation is typically used for refreshing access tokens to avoid race conditions.
   * @param expirationTime The expiration time of the token in milliseconds since Unix epoch.
   * @returns True if the token is not expired, false otherwise.
   */
  private isTokenNotExpired(expirationTime: number) {
    // Get the current time in milliseconds since Unix epoch
    const currentTime = new Date().getTime()

    // Calculate the time one hour before the token expiration time
    const oneHourBeforeExpiration = expirationTime - 60 * 60 * 1000 // Subtract one hour in milliseconds

    // Check if the current time is before one hour before the token expiration time
    return currentTime < oneHourBeforeExpiration
  }
}

function secsToUnixTime(seconds: number) {
  const now = new Date()
  return new Date(now.getTime() + seconds * 1000).getTime()
}

export function toBase64UrlEncoding(buffer: Buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function sha256(buffer: string | Uint8Array): Buffer {
  return crypto.createHash('sha256').update(buffer).digest()
}
