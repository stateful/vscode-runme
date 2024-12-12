import {
  authentication,
  AuthenticationGetSessionOptions,
  Disposable,
  ExtensionContext,
} from 'vscode'

import { AuthenticationProviders, GITHUB_USER_SIGNED_IN } from '../../constants'
import ContextState from '../contextState'
import AuthSessionChangeHandler from '../authSessionChangeHandler'
import { Kernel } from '../kernel'

export class GithubAuthProvider implements Disposable {
  constructor(
    readonly context: ExtensionContext,
    readonly kernel: Kernel,
  ) {
    const userSignedIn = context.globalState.get(GITHUB_USER_SIGNED_IN, false)
    ContextState.addKey(GITHUB_USER_SIGNED_IN, userSignedIn)
    AuthSessionChangeHandler.instance.addListener((e) => {
      if (e.provider.id === AuthenticationProviders.GitHub) {
        this.checkGithubSession()
      }
    })
  }

  async checkGithubSession() {
    const session = await getGithubAuthSession(false, true)
    this.context.globalState.update(GITHUB_USER_SIGNED_IN, !!session)
    ContextState.addKey(GITHUB_USER_SIGNED_IN, !!session)
    this.kernel.updateFeatureContext('githubAuth', !!session)
  }

  dispose() {}
}

export async function getGithubAuthSession(createIfNone: boolean = true, silent?: boolean) {
  const scope = ['user:email']
  const options: AuthenticationGetSessionOptions = {}

  if (silent !== undefined) {
    options.silent = silent
  } else {
    options.createIfNone = createIfNone
  }

  return await authentication.getSession(AuthenticationProviders.GitHub, scope, options)
}
