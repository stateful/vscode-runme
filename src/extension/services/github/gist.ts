import { Gist } from '../types'

import GitHubServiceFactory from './factory'

export async function createGist(gist: Gist) {
  const githubService = await new GitHubServiceFactory(['gist']).createService(true)
  return githubService.createGist(gist)
}
