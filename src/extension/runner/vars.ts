import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { ResolveVarsMode, ResolveVarsRequest } from '../grpc/runnerTypes'

import { IRunnerEnvironment } from './environment'
import { IRunnerChild } from './types'

export class GrpcRunnerVarsResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    private readonly envs: Record<string, string>,
  ) {}

  async resolveVars(script: string, mode: ResolveVarsMode, runnerEnv?: IRunnerEnvironment) {
    const env = Object.entries(this.envs).map(([key, value]: [string, string]) => `${key}=${value}`)
    const sessionId = runnerEnv?.getSessionId()
    const req = ResolveVarsRequest.create({
      source: { oneofKind: 'script', script },
      mode,
      sessionId,
      env,
    })
    console.log(JSON.stringify(req, null, 1))
    return this.client.resolveVars(req)
  }

  async dispose(): Promise<void> {}
}
