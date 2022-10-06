import fs from 'node:fs/promises'
import path from 'node:path'

import xdg from 'xdg-app-paths'

export async function getConfigFilePath () {
  return path.join(
    `${xdg('com.vercel.cli').dataDirs()[0]}.cli`, 'auth.json')
}

export async function getAuthToken () {
  const authFilePath = await getConfigFilePath()

  try {
    const canRead = await fs.access(authFilePath).then(() => true, () => false)
    if (canRead) {
      return JSON.parse(
        (await fs.readFile(authFilePath, 'utf-8')).toString()
      ).token as string
    }
  } catch (err: any) {
    return
  }
}
