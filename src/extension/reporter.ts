import { ExtensionContext, Disposable } from 'vscode'

import {
  initReporterClient,
  ReporterServiceClient,
  TransformRequest,
  type ReadyPromise,
} from './grpc/tcpClient'
import { IServer } from './server/kernelServer'

export class GrpcReporter {
  private client?: ReporterServiceClient
  protected ready: ReadyPromise
  protected disposables: Disposable[] = []

  constructor(
    protected context: ExtensionContext,
    protected server: IServer,
  ) {
    this.ready = new Promise((resolve) => {
      const disposable = server.onTransportReady(({ transport }) => {
        disposable.dispose()
        this.client = initReporterClient(transport)
        resolve()
      })

      server.transport().then((transport) => {
        this.client = initReporterClient(transport)
        resolve()
      })
    })
  }

  public async transform(input: TransformRequest) {
    await this.ready

    return this.client!.transform(input)
  }
}
