import got from 'got'

export interface VercelProject {
  id: string
  name: string
}

export interface VercelProjects {
  projects: VercelProject[]
}

export interface VercelTeams {
  teams: {
    id: string
    slug: string
  }[]
}

export interface VercelUser {
  user: {
    id: string
    username: string
  }
}

export function getProject (nameOrId: string, headers = {}): Promise<VercelProject> {
  return got(`https://api.vercel.com/v9/projects/${nameOrId}`, { headers }).json()
}
export function getProjects (teamId?: string, headers = {}): Promise<VercelProjects> {
  return got(
    'https://api.vercel.com/v9/projects',
    {
      headers,
      searchParams: teamId ? { teamId } : {}
    }
  ).json()
}
export function getUser (headers = {}): Promise<VercelUser> {
  return got('https://api.vercel.com/v2/user', { headers }).json()
}
export function listTeams (headers = {}): Promise<VercelTeams> {
  return got('https://api.vercel.com/v2/teams', { headers }).json()
}
export function createProject (projectName: string, headers = {}): Promise<VercelProject> {
  return got(
    'https://api.vercel.com/v9/projects',
    {
      headers,
      method: 'POST',
      json: {
        name: projectName,
        framework: null
      }
    }
  ).json()
}
