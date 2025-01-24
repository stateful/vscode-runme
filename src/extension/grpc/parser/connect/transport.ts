import tls from 'node:tls'
import http2 from 'node:http2'
import net from 'node:net'

import { Transport } from '@connectrpc/connect'
import { createGrpcTransport, GrpcTransportOptions } from '@connectrpc/connect-node'

const AUTHORITY = 'https://localhost:0'

export function createGrpcTcpTransport(transportOptions: GrpcTransportOptions): Transport {
  if (transportOptions.httpVersion !== '2') {
    throw new Error('This transport only supports HTTP/2')
  }

  const address = new URL(transportOptions.baseUrl)
  if (address.protocol !== 'unix:') {
    throw new Error('This transport only supports Unix domain sockets')
  }
  const path = address.pathname

  let clientSessionOptions: http2.ClientSessionOptions = {
    createConnection: (_auth, opts) => {
      const { ca, cert, key } = opts as http2.SecureClientSessionOptions

      // if unset it's not TLS
      if (!ca || !cert || !key) {
        return net.connect(path)
      }

      return tls.connect({ ca, cert, key, path })
    },
  }

  transportOptions.nodeOptions = {
    ...transportOptions.nodeOptions,
    ...clientSessionOptions,
  }
  transportOptions.baseUrl = AUTHORITY

  return createGrpcTransport(transportOptions)
}
