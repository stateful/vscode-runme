import { ParserService } from '@buf/stateful_runme.connectrpc_es/runme/parser/v1/parser_connect'
import {
  createGrpcTransport,
  GrpcTransportOptions,
  ConnectTransportOptions,
  createConnectTransport,
} from '@connectrpc/connect-node'
import {
  createClient as createConnectClient,
  Client as ConnectClient,
  Transport as ConnectTransport,
} from '@connectrpc/connect'

export {
  ParserService,
  createGrpcTransport,
  createConnectTransport,
  GrpcTransportOptions,
  ConnectTransportOptions,
  createConnectClient,
  ConnectClient,
  ConnectTransport,
}
