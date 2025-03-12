import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/tcpClient'
import {
  ResolveProgramRequestImpl,
  ResolveProgramRequest_Mode,
  ResolveProgramRequest_VarRetentionStrategyEnum,
} from '../grpc/runner/types'
import ContextState from '../contextState'
import { NOTEBOOK_ENV_VAR_MODE } from '../../constants'
import { EnvVarMode } from '../../types'

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

    const VarRetentionStrategyEnum = ResolveProgramRequest_VarRetentionStrategyEnum()
    let varRetentionStrategy = VarRetentionStrategyEnum.UNSPECIFIED
    switch (ContextState.getKey(NOTEBOOK_ENV_VAR_MODE)) {
      case EnvVarMode.Docs:
        varRetentionStrategy = VarRetentionStrategyEnum.FIRST
        break
      case EnvVarMode.Shell:
        varRetentionStrategy = VarRetentionStrategyEnum.LAST
        break
      default:
        varRetentionStrategy = VarRetentionStrategyEnum.UNSPECIFIED
        break
    }

    const req = ResolveProgramRequestImpl().create({
      source: { oneofKind: 'commands', commands: { lines: commands } },
      languageId,
      mode,
      varRetentionStrategy,
      sessionId,
      env,
    })
    return this.client.resolveProgram(req)
  }

  async dispose(): Promise<void> {}
}
