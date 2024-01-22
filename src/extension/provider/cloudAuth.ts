import { Disposable, authentication } from 'vscode'

import { checkSession } from '../utils'

export class CloudAuthProvider implements Disposable {
  constructor() {
    checkSession()
    authentication.onDidChangeSessions(() => {
      checkSession()
    })
  }
  dispose() {}
}
