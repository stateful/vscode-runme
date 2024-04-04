import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { MonitorEnvStoreRequest } from '../grpc/runner/v1'

import { IRunnerChild } from './types'

export class GrpcRunnerMonitorEnvStore implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(private readonly client: IRunnerServiceClient) {}

  monitorEnvStore(sessionId: string | undefined) {
    const req = MonitorEnvStoreRequest.create({ session: { id: sessionId } })
    return this.client.monitorEnvStore(req)
  }

  async dispose(): Promise<void> {}
}
