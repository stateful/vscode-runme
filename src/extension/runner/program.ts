import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/tcpClient'
import {
  ResolveProgramRequestImpl,
  ResolveProgramRequest_Mode,
  ResolveProgramRequest_RetentionEnum,
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

    const RetentionEnum = ResolveProgramRequest_RetentionEnum()
    let retention = RetentionEnum.UNSPECIFIED
    switch (ContextState.getKey(NOTEBOOK_ENV_VAR_MODE)) {
      case EnvVarMode.Docs:
        retention = RetentionEnum.FIRST_RUN
        break
      case EnvVarMode.Shell:
        retention = RetentionEnum.LAST_RUN
        break
      default:
        retention = RetentionEnum.UNSPECIFIED
        break
    }

    const req = ResolveProgramRequestImpl().create({
      source: { oneofKind: 'commands', commands: { lines: commands } },
      languageId,
      mode,
      retention,
      sessionId,
      env,
    })
    return this.client.resolveProgram(req)
  }

  async dispose(): Promise<void> {}
}
