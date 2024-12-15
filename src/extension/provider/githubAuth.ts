import { Disposable, ExtensionContext, authentication } from 'vscode'

import { checkSession } from '../utils'
import { GITHUB_USER_SIGNED_IN } from '../../constants'
import ContextState from '../contextState'

export class GithubAuthProvider implements Disposable {
  constructor(context: ExtensionContext) {
    const userSignedIn = context.globalState.get(GITHUB_USER_SIGNED_IN, false)
    ContextState.addKey(GITHUB_USER_SIGNED_IN, userSignedIn)
    authentication.onDidChangeSessions(() => {
      checkSession(context)
    })
  }
  dispose() {}
}
