import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { ResolveVarsMode, ResolveVarsRequest } from '../grpc/runnerTypes'

import { IRunnerChild } from './types'

export class GrpcRunnerVarsResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    private readonly mode: ResolveVarsMode,
    private readonly envs: Record<string, string>,
  ) {}

  async resolveVars(commands: string[], sessionId: string | undefined) {
    const mode = this.mode
    const env = Object.entries(this.envs).map(([key, value]: [string, string]) => `${key}=${value}`)

    const req = ResolveVarsRequest.create({
      source: { oneofKind: 'commands', commands: { lines: commands } },
      mode,
      sessionId,
      env,
    })
    // console.log(JSON.stringify(req, null, 1))
    const r = await this.client.resolveVars(req)
    // console.log(JSON.stringify(r.response?.vars, null, 1))
    console.log(r.response?.commands?.lines.join('\n'))
    return r
  }

  async dispose(): Promise<void> {}
}
