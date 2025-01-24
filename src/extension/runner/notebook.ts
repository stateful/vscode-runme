import { Disposable } from 'vscode'

import { IRunnerServiceClient } from '../grpc/tcpClient'
import { ResolveNotebookRequest } from '../grpc/runner/v1'
import { Serializer } from '../../types'
import { Notebook } from '../grpc/parser/tcp/types'

import { IRunnerChild } from './types'

export class GrpcRunnerNotebookResolver implements IRunnerChild {
  private disposables: Disposable[] = []

  constructor(
    private readonly client: IRunnerServiceClient,
    protected readonly notebook: Serializer.Notebook | undefined,
  ) {}

  async resolveNotebook(cellIndex: number) {
    if (!this.notebook) {
      throw new Error('Notebook is not available')
    }

    const req = ResolveNotebookRequest.create({
      notebook: Notebook.create(this.notebook as unknown as Notebook),
      cellIndex: cellIndex,
    })

    return this.client.resolveNotebook(req)
  }

  async dispose(): Promise<void> {}
}
