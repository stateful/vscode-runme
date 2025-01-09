import { ExtensionContext, Disposable } from 'vscode'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

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
      const disposable = server.onTransportReady(() => {
        disposable.dispose()
        resolve()
      })
    })

    server.onTransportReady(({ transport }) => {
      this.initReporterClient(transport)
    })
  }

  private async initReporterClient(transport?: GrpcTransport) {
    this.client = initReporterClient(transport ?? (await this.server.transport()))
  }

  public transform(input: TransformRequest) {
    return this.client?.transform(input)
  }
}
