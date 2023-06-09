import url from 'node:url'
import http from 'node:http'
import fs from 'node:fs/promises'

import got from 'got'
import getPort from 'get-port'
import {
  NotebookCellExecution,
  NotebookCellOutputItem,
  NotebookCellOutput,
  window,
  env,
  Uri,
} from 'vscode'
import type { Argv } from 'yargs'

import { renderError } from '../utils'
import { NotebookCellOutputManager } from '../../cell'

import { getAuthToken, getConfigFilePath } from './utils'

const LOGIN_OPTIONS = [
  'Continue with GitHub',
  'Continue with GitLab',
  'Continue with Bitbucket',
  'Continue with Email',
  'Continue with SAML Single Sign-On',
]

interface VercelCLILogin {
  github: boolean
  gitlab: boolean
  bitbucket: boolean
}

export async function login(
  exec: NotebookCellExecution,
  argv: Argv<VercelCLILogin>,
  outputs: NotebookCellOutputManager
): Promise<boolean> {
  const args = await argv.argv
  const method =
    (args.github && 'github') ||
    (args.gitlab && 'gitlab') ||
    (args.bitbucket && 'bitbucket') ||
    (await window.showQuickPick(LOGIN_OPTIONS))

  if (!method) {
    renderError(outputs, 'Please select login method.')
    return false
  }

  if (!method.includes('GitHub') && method !== 'github') {
    renderError(outputs, 'Login method not supported.')
    return false
  }

  /**
   * start simple oAuth server
   */
  const port = await getPort()
  let resolve: Function
  let reject: Function
  const authPromise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url!, true).query
    try {
      if (typeof queryObject.token !== 'string') {
        throw new Error('No token found!')
      }
      if (queryObject.confirmed !== '1') {
        throw new Error('Login not confirmed by auth partner')
      }
    } catch (err: any) {
      const error = `Failed to login: ${err.messag}`
      res.writeHead(500)
      res.end(error)
      return reject(new Error(error))
    }

    res.writeHead(301, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Location: `https://vercel.com/notifications/cli-login-success?email=${queryObject.email}`,
    })
    res.end()
    return resolve(queryObject)
  })
  server.listen(port)

  try {
    // eslint-disable-next-line max-len
    await env.openExternal(
      Uri.parse(
        `https://vercel.com/api/registration/login-with-github?mode=login&next=http%3A%2F%2Flocalhost%3A${port}`
      )
    )
    const { token } = (await authPromise) as any
    const verifyResponse = (await got(
      `https://api.vercel.com/registration/verify?token=${token}`
    ).json()) as any
    const configFilePath = await getConfigFilePath()
    await fs.writeFile(
      configFilePath,
      JSON.stringify({ token: verifyResponse.token })
    )
    server.close()
  } catch (err: any) {
    outputs.replaceOutputs(
      new NotebookCellOutput([NotebookCellOutputItem.text(err.message)])
    )
    return false
  }

  const { username } = (await authPromise) as any
  outputs.replaceOutputs(
    new NotebookCellOutput([
      NotebookCellOutputItem.text(`Logged in as ${username}`),
    ])
  )
  return true
}

export async function logout(
  exec: NotebookCellExecution,
  outputs: NotebookCellOutputManager
): Promise<boolean> {
  let token = await getAuthToken()

  if (!token) {
    outputs.replaceOutputs(
      new NotebookCellOutput([
        NotebookCellOutputItem.text(
          'Not currently logged in, so logout did nothing'
        ),
      ])
    )
    return true
  }

  /**
   * revoke access token
   */
  try {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headers = { Authorization: `Bearer ${token}` }
    await got('https://api.vercel.com/v3/user/tokens/current', {
      method: 'DELETE',
      headers,
    })
  } catch (err: any) {
    if (err.status === 403) {
      renderError(outputs, 'Token is invalid so it cannot be revoked')
    } else if (err.status !== 200) {
      renderError(outputs, `Failed revoking auth token: ${err.message}`)
    }
  }

  /**
   * delete config file
   */
  try {
    const configFilePath = await getConfigFilePath()
    await fs.unlink(configFilePath)
  } catch (err: any) {
    renderError(outputs, `Failed during logout: ${err.message}`)
    return false
  }

  outputs.replaceOutputs(
    new NotebookCellOutput([NotebookCellOutputItem.text('Logged out!')])
  )
  return true
}
