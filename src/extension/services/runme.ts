import fetch from 'cross-fetch'
import { Uri } from 'vscode'

import { getRunmeAppUrl } from '../../utils/configuration'

export interface IUserToken {
  token: string
}

export interface IAppToken {
  token: string
}

export class RunmeService {
  protected githubAccessToken: string
  private readonly apiBase = Uri.parse(getRunmeAppUrl(['api']), true)

  constructor({ githubAccessToken }: { githubAccessToken: string }) {
    this.githubAccessToken = githubAccessToken
  }
  async getUserToken(): Promise<IUserToken> {
    const userAuthEndpoint = Uri.joinPath(this.apiBase, '/auth/vscode').toString()
    let response
    try {
      response = await fetch(userAuthEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.githubAccessToken,
        }),
      })
      if (response.status >= 400) {
        throw new Error('Failed to get an user authorization token')
      }
      if (!response.ok) {
        throw new Error('Request to user authorization endpoint failed')
      }
    } catch (error) {
      throw new Error((error as any).message)
    }

    return response.json()
  }
  async getAppToken(userToken: IUserToken): Promise<IAppToken> {
    const appAuthEndpoint = Uri.joinPath(this.apiBase, '/auth/user/app').toString()
    let response
    try {
      response = await fetch(appAuthEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken.token}`,
        },
      })
      if (response.status >= 400) {
        throw new Error('Failed to get an app authorization token')
      }
      if (!response.ok) {
        throw new Error('Request to app authorization endpoint failed')
      }
    } catch (error) {
      throw new Error((error as any).message)
    }

    return response.json()
  }
}
