import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { ResolveVarsRequest } from '../grpc/runnerTypes'

import { IRunnerEnvironment } from './environment'
import { IRunnerChild } from './types'

export class GrpcRunnerVarsResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(private readonly client: IRunnerServiceClient) {}

  async resolveVars(script: string, runnerEnv?: IRunnerEnvironment) {
    const sessionId = runnerEnv?.getSessionId()
    const req = ResolveVarsRequest.create({ source: { oneofKind: 'script', script }, sessionId })
    return this.client.resolveVars(req)
  }

  async dispose(): Promise<void> {}
}
