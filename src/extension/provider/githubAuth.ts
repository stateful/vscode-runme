import { Disposable, ExtensionContext } from 'vscode'

import { checkSession } from '../utils'
import { AuthenticationProviders, GITHUB_USER_SIGNED_IN } from '../../constants'
import ContextState from '../contextState'
import AuthSessionChangeHandler from '../authSessionChangeHandler'

export class GithubAuthProvider implements Disposable {
  constructor(context: ExtensionContext) {
    const userSignedIn = context.globalState.get(GITHUB_USER_SIGNED_IN, false)
    ContextState.addKey(GITHUB_USER_SIGNED_IN, userSignedIn)
    AuthSessionChangeHandler.instance.addListener((e) => {
      if (e.provider.id === AuthenticationProviders.GitHub) {
        checkSession(context)
      }
    })
  }
  dispose() {}
}
