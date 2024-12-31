import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/client'
import { ResolveNotebookRequest } from '../grpc/runner/v1'
import { Notebook } from '../grpc/serializerTypes'

import { IRunnerChild } from './types'

export class GrpcRunnerNotebookResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    protected readonly notebook: Notebook | undefined,
  ) {}

  async resolveNotebook(cellName: string) {
    const req = ResolveNotebookRequest.create({
      notebook: this.notebook,
      target: { oneofKind: 'knownName', knownName: cellName },
    })

    return this.client.resolveNotebook(req)
  }

  async dispose(): Promise<void> {}
}
