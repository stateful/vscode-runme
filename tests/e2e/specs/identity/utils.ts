import fs from 'node:fs/promises'

import * as jsonc from 'comment-json'

export async function updateSettings({
  setting,
  value,
}: {
  setting: string
  value: string | boolean | number
}) {
  const documentPath = '/.vscode/settings.json'
  const absDocPath = await browser.executeWorkbench(async (vscode, documentPath) => {
    return `${vscode.workspace.rootPath}${documentPath}`
  }, documentPath)
  const source = await fs.readFile(absDocPath, 'utf-8')
  const settings = jsonc.parse(source) as any
  settings[setting] = value
  await fs.writeFile(absDocPath, jsonc.stringify(settings, null, 2))
}

function sanitizeOutput(output: string) {
  return output.trim().replace(/^\s+/gm, '')
}

export async function assertDocumentContains(absDocPath: string, matcher: string) {
  const source = await fs.readFile(absDocPath, 'utf-8')
  const savedContent = sanitizeOutput(source.toString()).split('\n')
  const matcherParts = sanitizeOutput(matcher).split('\n')
  for (let index = 0; index < savedContent.length; index++) {
    if (savedContent[index].includes('id=')) {
      const match = savedContent[index].match(FRONT_MATTER_ULID)
      await expect(match && match[1]).toBeTruthy()
    } else if (savedContent[index].includes('id:') || savedContent[index].includes('id=')) {
      await expect(savedContent[index]).toMatch(JSON_ULID)
    } else {
      await expect(savedContent[index]).toMatch(matcherParts[index])
    }
  }
}

export const FRONT_MATTER_ULID = /id=([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26})\s*\}/
export const JSON_ULID = /^id[:=] ([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26})$/
