import { Gist } from '../../services/types'

import GitHubServiceFactory from './githubServiceFactory'

export async function createGist(gist: Gist) {
  const githubService = await new GitHubServiceFactory(['gist']).createService(true)
  return githubService.createGist(gist)
}
