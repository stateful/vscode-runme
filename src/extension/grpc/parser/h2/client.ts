import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'
import { createGrpcTransport, GrpcTransportOptions } from '@connectrpc/connect-node'
import { createClient as createConnectClient, Client as ConnectClient } from '@connectrpc/connect'

export {
  ParserService,
  createGrpcTransport,
  GrpcTransportOptions,
  createConnectClient,
  ConnectClient,
}
