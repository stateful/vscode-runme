import fetch from 'cross-fetch'

import { getRunmeApiUrl } from '../../utils/configuration'

export interface IRunmeToken {
  token: string
}

export class RunmeService {
  protected githubAccessToken: string
  constructor({ githubAccessToken }: { githubAccessToken: string }) {
    this.githubAccessToken = githubAccessToken
  }
  async getAccessToken(): Promise<IRunmeToken | undefined> {
    try {
      const response = await fetch(`${getRunmeApiUrl()}/auth/vscode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: this.githubAccessToken,
        }),
      })
      if (response.status >= 400) {
        throw new Error('Failed to get an authorization token')
      }
      if (response.ok) {
        return response.json()
      }
    } catch (error) {
      throw new Error((error as any).message)
    }
  }
}
