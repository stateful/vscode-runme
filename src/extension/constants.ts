export const DEFAULT_ENV = {
  RUNME_TASK: 'true',
  PATH: process.env.PATH || ''
}
export const ENV_STORE = new Map<string, string>(
  Object.entries(DEFAULT_ENV)
)
