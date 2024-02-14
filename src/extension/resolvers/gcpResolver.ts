import { TextDocument } from 'vscode'
import { IDisposable } from 'xterm-headless'

import { StringIndexable } from '../../types'

export enum GCPSupportedView {
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

export interface GCPData {
  [GCPSupportedView.CLUSTER]: ClusterPath
  [GCPSupportedView.CLUSTERS]: ClustersPath
}

export type GoogleKubernetesFeature<T extends GCPSupportedView> = T extends any
  ? {
      view: T
      data: GCPData[T]
    }
  : never

export class GCPResolver implements IDisposable {
  private supportedFeatures: Map<string, GoogleKubernetesFeature<GCPSupportedView>> = new Map()
  private resolvedFeature?: GoogleKubernetesFeature<GCPSupportedView> | undefined
  constructor(private cell: TextDocument) {
    this.supportedFeatures.set('/kubernetes/list/overview', {
      view: GCPSupportedView.CLUSTERS,
      data: {
        project: '',
      },
    })
    this.supportedFeatures.set('/kubernetes/clusters/details', {
      view: GCPSupportedView.CLUSTER,
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
      let supportedFeature: GoogleKubernetesFeature<GCPSupportedView> | null = null
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
