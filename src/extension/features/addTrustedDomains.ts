import { Uri, workspace, window } from 'vscode'
import { parse as jsoncParse } from 'jsonc-parser'

import { FeatureName } from '../../types'
import { isOnInContextState } from '../features'
import getLogger from '../logger'

const logger = getLogger('AddTrustedDomains')
const trustedDomain = 'https://*.stateful.com'

export async function addTrustedDomains() {
  if (!isOnInContextState(FeatureName.AddTrustedDomains)) {
    return
  }

  try {
    const uri = Uri.parse('trustedDomains:/Trusted Domains')
    const bytes = await workspace.fs.readFile(uri)
    const json = jsoncParse(Buffer.from(bytes).toString('utf8')) as string[]
    const isTrusted = json.some((entry) => entry === trustedDomain)

    if (!isTrusted) {
      json.push(trustedDomain)
      await workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(json)))

      window.showInformationMessage(
        'Stateful Cloud domains have been added as trusted domains. ' +
          'This configuration is enabled by default in our playground environments only.',
      )
    }
  } catch (error) {
    let message
    if (error instanceof Error) {
      message = error.message
    } else {
      message = JSON.stringify(error)
    }

    logger.error(message)
  }
}
