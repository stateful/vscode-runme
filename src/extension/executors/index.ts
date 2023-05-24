import { ENV_STORE } from '../constants'

import { sh, bash } from './task'
import { vercel } from './vercel'
import { deno } from './deno'
import { github } from './github'


// TODO: want to use a better abstraction than this
export interface IEnvironmentManager {
  set(key: string, value: string|undefined): Promise<void>|void
  get(key: string): Promise<string|undefined>|string|undefined
}

export const ENV_STORE_MANAGER: IEnvironmentManager = {
  get: (key) => ENV_STORE.get(key),
  set: (key, val = '') => { ENV_STORE.set(key, val) }
}

export default { sh, bash, vercel, deno, github }
