import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/tcpClient'
import { ResolveProgramRequestImpl, ResolveProgramRequest_Mode } from '../grpc/runner/types'

import { IRunnerChild } from './types'

export class GrpcRunnerProgramResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    private readonly mode: ResolveProgramRequest_Mode,
    private readonly envs: Record<string, string>,
  ) {}

  async resolveProgram(commands: string[], languageId: string, sessionId: string | undefined) {
    const mode = this.mode
    const env = Object.entries(this.envs).map(([key, value]: [string, string]) => `${key}=${value}`)

    const req = ResolveProgramRequestImpl().create({
      source: { oneofKind: 'commands', commands: { lines: commands } },
      languageId,
      mode,
      sessionId,
      env,
    })
    return this.client.resolveProgram(req)
  }

  async dispose(): Promise<void> {}
}
