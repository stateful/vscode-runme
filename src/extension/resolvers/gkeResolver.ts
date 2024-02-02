import { TextDocument } from 'vscode'
import { IDisposable } from 'xterm-headless'

import { StringIndexable } from '../../types'

export enum GKESupportedView {
  CLUSTERS = 'clusters',
  CLUSTER = 'cluster',
}

export interface ClusterPath extends StringIndexable {
  location: string
  project: string
  cluster: string
  urlRegex?: RegExp
}

export interface ClustersPath extends StringIndexable {
  project: string | null
}

export interface GKEData {
  [GKESupportedView.CLUSTER]: ClusterPath
  [GKESupportedView.CLUSTERS]: ClustersPath
}

export type GoogleKubernetesFeature<T extends GKESupportedView> = T extends any
  ? {
      view: T
      data: GKEData[T]
    }
  : never

export class GKEResolver implements IDisposable {
  private supportedFeatures: Map<string, GoogleKubernetesFeature<GKESupportedView>> = new Map()
  private resolvedFeature?: GoogleKubernetesFeature<GKESupportedView> | undefined
  constructor(private cell: TextDocument) {
    this.supportedFeatures.set('/kubernetes/list/overview', {
      view: GKESupportedView.CLUSTERS,
      data: {
        project: '',
      },
    })
    this.supportedFeatures.set('/kubernetes/clusters/details', {
      view: GKESupportedView.CLUSTER,
      data: {
        location: '',
        cluster: '',
        urlRegex: /kubernetes\/clusters\/details\/([^/]+)\/([^/]+)\/details/,
        project: '',
      },
    })

    const text = this.cell.getText()
    if (text.startsWith('https://console.cloud.google.com')) {
      const url = new URL(text)
      let supportedFeature: GoogleKubernetesFeature<GKESupportedView> | null = null
      for (const [key, feature] of this.supportedFeatures) {
        if (feature.data.urlRegex?.test(url.pathname) || key === url.pathname) {
          supportedFeature = feature
          break
        }
      }
      if (supportedFeature) {
        if (supportedFeature.data.urlRegex && supportedFeature.data) {
          const matches = supportedFeature.data.urlRegex.exec(url.pathname)
          if (matches) {
            const [, ...fields] = matches
            Object.keys(supportedFeature.data).forEach((field, index) => {
              supportedFeature!.data![field] = fields[index]
            })
          }
        }
        supportedFeature.data.project = url.searchParams.get('project')
        this.resolvedFeature = {
          ...supportedFeature,
        }
      }
    }
  }

  match() {
    return !!this.resolvedFeature
  }

  get() {
    return this.resolvedFeature
  }

  dispose(): void {
    this.supportedFeatures.clear()
  }
}
