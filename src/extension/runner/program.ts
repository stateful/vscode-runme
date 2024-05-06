import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { ResolveProgramRequest_Mode, ResolveProgramRequest } from '../grpc/runner/v2alpha1'

import { IRunnerChild } from './types'

export class GrpcRunnerProgramResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    private readonly mode: ResolveProgramRequest_Mode,
    private readonly envs: Record<string, string>,
  ) {}

  async resolveProgram(commands: string[], sessionId: string | undefined) {
    const mode = this.mode
    const env = Object.entries(this.envs).map(([key, value]: [string, string]) => `${key}=${value}`)

    const req = ResolveProgramRequest.create({
      source: { oneofKind: 'commands', commands: { lines: commands } },
      mode,
      sessionId,
      env,
    })
    return this.client.resolveProgram(req)
  }

  async dispose(): Promise<void> {}
}
