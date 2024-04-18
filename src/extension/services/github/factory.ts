import { authentication } from 'vscode'

import { AuthenticationProviders } from '../../../constants'
import { GitHubService } from '..'

class GitHubServiceFactory {
  #service: GitHubService | undefined

  constructor(private scopes: string[]) {}

  async createService(createIfNone?: boolean): Promise<GitHubService> {
    if (this.#service) {
      return this.#service
    }
    const session =
      // @ts-expect-error test token only for testing purposes
      globalThis._RUNME_TEST_TOKEN ||
      (await authentication.getSession(
        AuthenticationProviders.GitHub,
        this.scopes,
        createIfNone ? { createIfNone } : {},
      ))
    if (!session) {
      throw new Error('Missing a valid GitHub session')
    }
    this.#service = new GitHubService(session.accessToken)
    return this.#service
  }
}

export default GitHubServiceFactory
