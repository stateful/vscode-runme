import { IRunnerServiceClient } from '../grpc/tcpClient'
import { Session } from '../grpc/runner/types'
import getLogger from '../logger'
import { convertEnvList } from '../utils'

import { IRunnerChild } from './types'

export interface IRunnerEnvironment extends IRunnerChild {
  getSessionId(): string
  initialEnvs(): Set<string>
}

export class GrpcRunnerEnvironment implements IRunnerEnvironment {
  log = getLogger('GrpcRunnerEnvironment')
  initialEnvKeys: Set<string>

  constructor(
    private readonly client: IRunnerServiceClient,
    private readonly session: Session,
  ) {
    const env = (session as any).envs ?? (session as any).env
    this.initialEnvKeys = new Set(Object.keys(convertEnvList(env)))
  }

  getRunmeSession(): Session {
    return this.session
  }

  getSessionId(): string {
    return this.session.id
  }

  async dispose() {
    await this.delete()
  }

  private async delete() {
    try {
      return await this.client.deleteSession({ id: this.getSessionId() })
    } catch (err: any) {
      // it's not unexpected deletions to fail when server died; trace error
      let msg = err
      if (err instanceof Error) {
        msg = err.message
      }
      this.log.error('DeleteSession failed with error:', msg)
    }
  }

  initialEnvs(): Set<string> {
    return this.initialEnvKeys
  }
}
