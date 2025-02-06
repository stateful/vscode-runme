import { Disposable } from 'vscode'

import { initNotebookClient, NotebookServiceClient, ReadyPromise } from '../grpc/tcpClient'
import { ResolveNotebookRequest } from '../grpc/notebook/v1alpha1'
import { Serializer } from '../../types'
import { Notebook } from '../grpc/parser/tcp/types'
import { IServer } from '../server/kernelServer'
import { CommandMode } from '../grpc/runner/v1'

import { IRunnerChild } from './types'

export class GrpcNotebook implements IRunnerChild {
  private client?: NotebookServiceClient
  private ready: ReadyPromise
  private disposables: Disposable[] = []

  constructor(
    protected server: IServer,
    protected readonly notebook: Serializer.Notebook | undefined,
  ) {
    this.ready = new Promise((resolve) => {
      const disposable = server.onTransportReady(({ transport }) => {
        disposable.dispose()
        this.client = initNotebookClient(transport)
        resolve()
      })

      server.transport().then((transport) => {
        this.client = initNotebookClient(transport)
        resolve()
      })
    })
  }

  async resolveDaggerNotebook(cellIndex: number) {
    if (!this.notebook) {
      throw new Error('Notebook is not available')
    }
    await this.ready

    const req = ResolveNotebookRequest.create({
      notebook: Notebook.create(this.notebook as unknown as Notebook),
      commandMode: CommandMode.DAGGER,
      cellIndex: { value: cellIndex },
    })

    const resp = await this.client!.resolveNotebook(req)

    return resp.response.script
  }

  async dispose(): Promise<void> {}
}
