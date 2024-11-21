import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import fetch from 'cross-fetch'
import { Uri } from 'vscode'

import { getRunmeAppUrl } from '../../utils/configuration'
import { getFeaturesContext } from '../features'
import { StatefulAuthProvider } from '../provider/statefulAuth'

export async function InitializeCloudClient(uri?: string) {
  const session = await StatefulAuthProvider.getSession()

  if (!session) {
    throw new Error('You must authenticate with your Stateful account')
  }

  return InitializeClient({ uri, token: session.accessToken })
}

export function InitializeClient({ uri, token }: { uri?: string | undefined; token: string }) {
  const authLink = setContext((_, { headers }) => {
    const context = getFeaturesContext()
    return {
      headers: {
        ...headers,
        'Auth-Provider': 'platform',
        authorization: token ? `Bearer ${token}` : '',
        'X-Extension-Id': context?.extensionId,
        'X-Extension-Os': context?.os,
        'X-Extension-Version': context?.extensionVersion,
        'X-Code-Version': context?.vsCodeVersion,
      },
    }
  })
  const appApiUrl = Uri.joinPath(Uri.parse(getRunmeAppUrl(['api']), true), '/graphql').toString()
  const link = new HttpLink({ fetch, uri: uri || appApiUrl })
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    credentials: 'include',
    link: authLink.concat(link),
  })

  return client
}
