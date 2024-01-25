import { Disposable, ExtensionContext, authentication } from 'vscode'

import { checkSession } from '../utils'
import { CLOUD_USER_SIGNED_IN } from '../../constants'
import ContextState from '../contextState'

export class CloudAuthProvider implements Disposable {
  constructor(context: ExtensionContext) {
    const userSignedIn = context.globalState.get(CLOUD_USER_SIGNED_IN, false)
    ContextState.addKey(CLOUD_USER_SIGNED_IN, userSignedIn)
    authentication.onDidChangeSessions(() => {
      checkSession(context)
    })
  }
  dispose() {}
}
