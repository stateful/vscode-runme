import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'
import {
  createGrpcTransport as createGrpcHttpTransport,
  GrpcTransportOptions,
  ConnectTransportOptions,
  createConnectTransport,
} from '@connectrpc/connect-node'
import {
  createClient as createConnectClient,
  Client as ConnectClient,
  Transport as ConnectTransport,
} from '@connectrpc/connect'

import { createGrpcTcpTransport } from './transport'

export {
  ParserService,
  createGrpcTcpTransport,
  createGrpcHttpTransport,
  createConnectTransport,
  GrpcTransportOptions,
  ConnectTransportOptions,
  createConnectClient,
  ConnectClient,
  ConnectTransport,
}
