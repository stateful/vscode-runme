import * as crypto from 'node:crypto'

import {
  authentication,
  AuthenticationProvider,
  Disposable,
  env,
  EventEmitter,
  ExtensionContext,
  ProgressLocation,
  Uri,
  window,
  AuthenticationSession,
  AuthenticationProviderAuthenticationSessionsChangeEvent,
  Event,
} from 'vscode'
import { v4 as uuid } from 'uuid'
import fetch from 'node-fetch'

import { getRunmeAppUrl } from '../../utils/configuration'
import { AuthenticationProviders, PLATFORM_USER_SIGNED_IN } from '../../constants'
import { RunmeUriHandler } from '../handler/uri'
import ContextState from '../contextState'

const AUTH_NAME = 'Stateful'
const SESSIONS_SECRET_KEY = `${AuthenticationProviders.Stateful}.sessions`

interface TokenInformation {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface StatefulAuthSession extends AuthenticationSession {
  refreshToken: string
  expiresIn: number
  isExpired: boolean
}

// Interface declaration for a PromiseAdapter
interface PromiseAdapter<T, U> {
  // Function signature of the PromiseAdapter
  (
    // Input value of type T that the adapter function will process
    value: T,
    // Function to resolve the promise with a value of type U or a promise that resolves to type U
    resolve: (value: U | PromiseLike<U>) => void,
    // Function to reject the promise with a reason of any type
    reject: (reason: any) => void,
  ): any // The function can return a value of any type
}

const passthrough = (value: any, resolve: (value?: any) => void) => resolve(value)

export class StatefulAuthProvider implements AuthenticationProvider, Disposable {
  #disposables: Disposable[] = []
  // used as compound key in a hash-table; does not contain sensitive data
  #insensitiveHashedApiUrl: string = crypto
    .createHash('sha1')
    .update(getRunmeAppUrl(['api']))
    .digest('hex')
  #pendingStates: string[] = []
  #codeVerfifiers = new Map<string, string>()
  #scopes = new Map<string, string[]>()
  #uriHandler: RunmeUriHandler
  #codeExchangePromises = new Map<
    string,
    { promise: Promise<TokenInformation>; cancel: EventEmitter<void> }
  >()

  readonly #onSessionChange = this.register(
    new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>(),
  )

  constructor(
    private readonly context: ExtensionContext,
    uriHandler: RunmeUriHandler,
  ) {
    this.#uriHandler = uriHandler
    this.#disposables.push(
      Disposable.from(
        authentication.registerAuthenticationProvider(
          AuthenticationProviders.Stateful,
          AUTH_NAME,
          this,
          {
            supportsMultipleAccounts: false,
          },
        ),
      ),
    )
  }

  get onDidChangeSessions() {
    return this.#onSessionChange.event
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
      const sessions = await this.getAllSessions()
      if (!sessions.length) {
        return []
      }

      // Get all required scopes
      const allScopes = this.getScopes(scopes || []) as string[]

      if (allScopes.length) {
        if (!scopes?.length) {
          const session = await this.getSession(sessions, allScopes)
          if (session && !session.isExpired) {
            return [session]
          }

          return []
        }

        const session = await this.getSession(sessions, scopes)
        if (!session) {
          return []
        }

        if (session && !session.isExpired) {
          return [session]
        }

        const token = await this.getAccessToken(session.refreshToken)
        const { accessToken, refreshToken, expiresIn } = token

        if (accessToken) {
          const updatedSession = {
            ...session,
            accessToken,
            refreshToken,
            expiresIn: secsToUnixTime(expiresIn),
            scopes: scopes,
          }

          await this.updateSession(updatedSession)
          ContextState.addKey(PLATFORM_USER_SIGNED_IN, true)
          return [updatedSession]
        } else {
          ContextState.addKey(PLATFORM_USER_SIGNED_IN, false)
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
      const { accessToken, refreshToken, expiresIn } = await this.login(scopes)

      if (!accessToken) {
        throw new Error('Stateful login failure')
      }

      const userinfo: { name: string; email: string } = await this.getUserInfo(accessToken)
      const session: StatefulAuthSession = {
        id: uuid(),
        expiresIn: secsToUnixTime(expiresIn),
        accessToken,
        refreshToken,
        account: {
          label: userinfo.name,
          id: userinfo.email,
        },
        scopes: this.getScopes(scopes),
        isExpired: false,
      }

      ContextState.addKey(PLATFORM_USER_SIGNED_IN, true)

      await this.persistSessions([session], { added: [session], removed: [], changed: [] })
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
    const sessions = await this.getAllSessions()
    if (!sessions.length) {
      return
    }

    const sessionIdx = await this.findSessionIndex(sessions, session)
    if (sessionIdx < 0) {
      return
    }

    sessions[sessionIdx] = session
    await this.persistSessions(sessions, { added: [], removed: [], changed: [session] })
  }

  /**
   * Remove an existing session
   * @param sessionId
   */
  public async removeSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions()
    if (!sessions.length) {
      return
    }

    const sessionIdx = await this.findSessionIndexById(sessions, sessionId)
    if (sessionIdx < 0) {
      return
    }

    const session = sessions[sessionIdx]
    sessions.splice(sessionIdx, 1)

    await this.persistSessions(sessions, { added: [], removed: [session], changed: [] })
  }

  /**
   * Dispose the registered services
   */
  public async dispose() {
    this.#disposables.forEach((d) => d.dispose())
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
        scopes = this.getScopes(scopes)

        const codeVerifier = toBase64UrlEncoding(crypto.randomBytes(32))
        const codeChallenge = toBase64UrlEncoding(sha256(codeVerifier))

        let callbackUri = await env.asExternalUri(Uri.parse(this.redirectUri))
        const callbackQuery = new URLSearchParams(callbackUri.query)
        const stateId = callbackQuery.get('state') || nonceId

        callbackQuery.set('state', encodeURIComponent(stateId))
        callbackQuery.set('nonce', encodeURIComponent(nonceId))
        callbackUri = callbackUri.with({
          query: callbackQuery.toString(),
        })

        this.#pendingStates.push(stateId)
        this.#codeVerfifiers.set(stateId, codeVerifier)
        this.#scopes.set(stateId, scopes)

        const searchParams = new URLSearchParams({
          state: encodeURIComponent(callbackUri.toString(true)),
          scope: scopes.join(' '),
          codeChallengeMethod: 'S256',
          codeChallenge: codeChallenge,
        })

        const uri = Uri.parse(`${getRunmeAppUrl(['api'])}idp-authorize?${searchParams.toString()}`)
        await env.openExternal(uri)

        // Retrieving the codeExchangePromise corresponding to the scopeString from the map
        let codeExchangePromise = this.#codeExchangePromises.get(scopeString)
        // Checking if codeExchangePromise is not found
        if (!codeExchangePromise) {
          // Creating a new codeExchangePromise using promiseFromEvent and setting up
          // event handling with handleUri function
          codeExchangePromise = promiseFromEvent(
            this.#uriHandler.onAuthEvent,
            this.handleUri(scopes),
          )
          // Storing the newly created codeExchangePromise in the map with the corresponding scopeString
          this.#codeExchangePromises.set(scopeString, codeExchangePromise)
        }

        try {
          // Returning the result of the first resolved promise or the first rejected promise among multiple promises
          return await Promise.race([
            // Waiting for the codeExchangePromise to resolve
            codeExchangePromise.promise,
            // Creating a new promise that rejects after 60000 milliseconds
            new Promise<string>((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
            // Creating a promise based on an event, rejecting with 'User Cancelled' when
            // token.onCancellationRequested event occurs
            promiseFromEvent<any, any>(token.onCancellationRequested, (_, __, reject) => {
              reject('User Cancelled')
            }).promise,
          ])
        } finally {
          // Filtering out the current stateId from the array of pendingStates
          this.#pendingStates = this.#pendingStates.filter((n) => n !== stateId)
          // Firing the cancel event of codeExchangePromise if it exists
          codeExchangePromise?.cancel.fire()
          // Deleting the codeExchangePromise corresponding to scopeString from the map
          this.#codeExchangePromises.delete(scopeString)
          // Deleting the codeVerifier corresponding to stateId from the map
          this.#codeVerfifiers.delete(stateId)
          // Deleting the scope corresponding to stateId from the map
          this.#scopes.delete(stateId)
        }
      },
    )
  }

  /**
   * Handle the redirect to VS Code (after sign in from Stateful)
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

      const codeVerifier = this.#codeVerfifiers.get(stateId)
      if (!codeVerifier) {
        reject(new Error('No code verifier'))
        return
      }

      // Check if it is a valid auth request started by the extension
      if (!this.#pendingStates.some((n) => n === stateId)) {
        reject(new Error('State not found'))
        return
      }

      const postData = {
        code,
        codeVerifier,
      }

      const response = await fetch(`${getRunmeAppUrl(['api'])}idp-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      })

      const { accessToken, refreshToken, expiresIn } = await response.json()

      resolve({ accessToken, refreshToken, expiresIn })
    }

  /**
   * Get the user info from Stateful
   * @param token
   * @returns
   */
  private async getUserInfo(token: string) {
    const response = await fetch(`${getRunmeAppUrl(['api'])}idp-user-info`, {
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
    const modifiedScopes = [...scopes]

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
  private async getAccessToken(currentRefreshToken: string): Promise<TokenInformation> {
    const postData = {
      refreshToken: currentRefreshToken,
    }

    const response = await fetch(`${getRunmeAppUrl(['api'])}idp-refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    const { accessToken, refreshToken, expiresIn } = await response.json()

    return { accessToken, refreshToken, expiresIn }
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

  private get sessionSecretKey() {
    return `${SESSIONS_SECRET_KEY}.${this.#insensitiveHashedApiUrl}`
  }

  private async getAllSessions(): Promise<StatefulAuthSession[]> {
    const allSessions = await this.context.secrets.get(this.sessionSecretKey)
    if (!allSessions) {
      return []
    }

    try {
      const sessions = JSON.parse(allSessions) as StatefulAuthSession[]
      return sessions
    } catch (e) {
      return []
    }
  }

  private async findSessionIndex(sessions: StatefulAuthSession[], session: StatefulAuthSession) {
    return sessions.findIndex((s) => s.id === session.id)
  }

  private async findSessionIndexById(sessions: StatefulAuthSession[], id: string) {
    return sessions.findIndex((s) => s.id === id)
  }

  private async persistSessions(
    sessions: StatefulAuthSession[],
    changes: {
      added: StatefulAuthSession[]
      removed: StatefulAuthSession[]
      changed: StatefulAuthSession[]
    },
  ) {
    await this.context.secrets.store(this.sessionSecretKey, JSON.stringify(sessions))
    this.#onSessionChange.fire(changes)
  }

  protected register<T extends Disposable>(disposable: T): T {
    this.#disposables.push(disposable)
    return disposable
  }

  async getSession(sessions: StatefulAuthSession[], scopes?: string[]) {
    const session = sessions.find((s) => scopes?.every((scope) => s.scopes.includes(scope)))

    if (!session) {
      return null
    }

    if (this.isTokenNotExpired(session.expiresIn)) {
      // Emit a 'session changed' event to notify that the token has been accessed.
      // This ensures that any components listening for session changes are notified appropriately.
      this.#onSessionChange.fire({ added: [], removed: [], changed: [session] })
      ContextState.addKey(PLATFORM_USER_SIGNED_IN, true)
      return session
    }

    return { ...session, isExpired: true }
  }
}

/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided by an adapter.
 *
 * If specified, the adapter is a function that will be called with
 * `(event, resolve, reject)`. It will be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified by the adapter
 */
function promiseFromEvent<T, U>(
  event: Event<T>,
  adapter: PromiseAdapter<T, U> = passthrough,
): { promise: Promise<U>; cancel: EventEmitter<void> } {
  let subscription: Disposable
  let cancel = new EventEmitter<void>()

  // Return an object containing a promise and a cancel EventEmitter
  return {
    // Creating a new Promise
    promise: new Promise<U>((resolve, reject) => {
      // Listening for the cancel event and rejecting the promise with 'Cancelled' when it occurs
      cancel.event((_) => reject('Cancelled'))
      // Subscribing to the event
      subscription = event((value: T) => {
        try {
          // Resolving the promise with the result of the adapter function
          Promise.resolve(adapter(value, resolve, reject)).catch(reject)
        } catch (error) {
          // Rejecting the promise if an error occurs during execution
          reject(error)
        }
      })
    }).then(
      // Disposing the subscription and returning the result when the promise resolves
      (result: U) => {
        subscription.dispose()
        return result
      },
      // Disposing the subscription and re-throwing the error when the promise rejects
      (error) => {
        subscription.dispose()
        throw error
      },
    ),
    // Returning the cancel EventEmitter
    cancel,
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
