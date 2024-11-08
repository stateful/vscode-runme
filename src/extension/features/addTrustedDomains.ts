import { Uri, workspace } from 'vscode'
import { parse as jsoncParse } from 'jsonc-parser'

import { FeatureName } from '../../types'
import getLogger from '../logger'

import { isOnInContextState } from '.'

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
