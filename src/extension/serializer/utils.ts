import { Uri } from 'vscode'

import { getOutputsFilePath } from './serializer'

export function getOutputsUri(docUri: Uri, sessionId: string): Uri {
  const fspath = getOutputsFilePath(docUri.fsPath, sessionId)
  const query = docUri.query
  return Uri.parse(`${docUri.scheme}://${fspath}?${query}`)
}
