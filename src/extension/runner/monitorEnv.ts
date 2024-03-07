import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { MonitorEnvRequest } from '../grpc/runnerTypes'

import { IRunnerChild } from './types'

export class GrpcRunnerMonitorEnv implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(private readonly client: IRunnerServiceClient) {}

  monitorEnv(sessionId: string | undefined) {
    const req = MonitorEnvRequest.create({ session: { id: sessionId } })
    return this.client.monitorEnv(req)
  }

  async dispose(): Promise<void> {}
}
