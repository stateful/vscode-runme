import { fetch, Response } from 'undici'

import { Deployment ,
  ManifestEntry,
  Project,
} from './api_types'


export interface RequestOptions {
  method?: string
  body?: any
}

export class APIError extends Error {
  code: string
  xDenoRay: string | null

  name = 'APIError'

  constructor(code: string, message: string, xDenoRay: string | null) {
    super(message)
    this.code = code
    this.xDenoRay = xDenoRay
  }

  toString() {
    let error = `${this.name}: ${this.message}`
    if (this.xDenoRay !== null) {
      error += `\nx-deno-ray: ${this.xDenoRay}`
      error += '\nIf you encounter this error frequently,' +
        ' contact us at deploy@deno.com with the above x-deno-ray.'
    }
    return error
  }
}

export class API {
  #endpoint: string
  #authorization: string

  constructor(authorization: string, endpoint: string) {
    this.#authorization = authorization
    this.#endpoint = endpoint
  }

  static fromToken(token: string) {
    const endpoint = process.env['DEPLOY_API_ENDPOINT'] ??
      'https://dash.deno.com'
    return new API(`Bearer ${token}`, endpoint)
  }

  async #request(path: string, opts: RequestOptions = {}): Promise<Response> {
    const url = `${this.#endpoint}/api${path}`
    const method = opts.method ?? 'GET'
    const body = opts.body !== undefined
      ? false /*opts.body instanceof FormData*/ ? opts.body : JSON.stringify(opts.body)
      : undefined
    const headers = {
      'Accept': 'application/json',
      'Authorization': this.#authorization,
      ...(opts.body !== undefined
        ? false // opts.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }
        : {}),
    }
    return await fetch(url, { method, headers, body })
  }

  async #requestJson<T>(path: string, opts?: RequestOptions): Promise<T> {
    const res = await this.#request(path, opts)
    if (res.headers.get('Content-Type') !== 'application/json') {
      const text = await res.text()
      throw new Error(`Expected JSON, got '${text}'`)
    }
    const json: any = await res.json()
    if (res.status !== 200) {
      const xDenoRay = res.headers.get('x-deno-ray')
      throw new APIError(json.code, json.message, xDenoRay)
    }
    return json
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      return await this.#requestJson(`/projects/${id}`)
    } catch (err) {
      if (err instanceof APIError && err.code === 'projectNotFound') {
        return null
      }
      throw err
    }
  }

  async promoteDeployment (id: string, productionDeployment: string): Promise<Boolean> {
    try {
      await this.#requestJson(`/projects/${id}`, {
        method: 'PATCH',
        body: { productionDeployment }
      }) as any

      return true
    } catch (err: any) {
      console.error(`[Runme]: Deno API Error - couldn't promote deployment: ${err.message}`)
      return false
    }
  }

  async getProjects(): Promise<Project[] | null> {
    try {
      return await this.#requestJson('/projects?limit=10')
    } catch (err) {
      if (err instanceof APIError && err.code === 'projectNotFound') {
        return null
      }
      throw err
    }
  }

  async getDeployments(id: string): Promise<Deployment[] | null> {
    try {
      return (await this.#requestJson<[Deployment[] | null, {}]>(`/projects/${id}/deployments?limit=10`))[0]
    } catch (err) {
      if (err instanceof APIError && err.code === 'deploymentsNotFound') {
        return null
      }
      throw err
    }
  }

  async projectNegotiateAssets(
    id: string,
    manifest: { entries: Record<string, ManifestEntry> },
  ): Promise<string[]> {
    return await this.#requestJson(`/projects/${id}/assets/negotiate`, {
      method: 'POST',
      body: manifest,
    })
  }
}
