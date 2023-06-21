import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import fetch from 'cross-fetch'
import { setContext } from '@apollo/client/link/context'

import { getRunmeApiUrl } from '../../utils/configuration'

export function InitializeClient({
  uri,
  runmeToken,
}: {
  uri?: string | undefined
  runmeToken: string
}) {
  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: runmeToken ? `Bearer ${runmeToken}` : '',
      },
    }
  })
  const link = new HttpLink({ fetch, uri: uri || `${getRunmeApiUrl()}/graphql` })
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    credentials: 'include',
    link: authLink.concat(link),
  })

  return client
}
