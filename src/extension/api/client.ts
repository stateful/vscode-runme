import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import fetch from 'cross-fetch'

import { getRunmeApiUrl } from '../../utils/configuration'

export function InitializeClient({ uri }: { uri: string } = { uri: '' }) {
  const graphQlApiUrl = getRunmeApiUrl()
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ fetch, uri: uri || graphQlApiUrl }),
  })

  return client
}
