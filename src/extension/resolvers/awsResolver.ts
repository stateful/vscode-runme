import { TextDocument, Disposable } from 'vscode'

import { StringIndexable } from '../../types'

export enum AWSSupportedView {
  EC2Instances = 'ec2Instances',
  EC2InstanceDetails = 'ec2InstanceDetails',
}

export interface EC2InstancePath extends StringIndexable {
  region: string | null
  urlRegex?: RegExp
}

export interface EC2InstanceDetailsPath extends StringIndexable {
  region: string | null
  instanceId: string | null
  urlRegex?: RegExp
}

export interface AWSData {
  [AWSSupportedView.EC2Instances]: EC2InstancePath
  [AWSSupportedView.EC2InstanceDetails]: EC2InstanceDetailsPath
}

export type AWSFeature<T extends AWSSupportedView> = T extends any
  ? {
      view: T
      data: AWSData[T]
    }
  : never

export class AWSResolver implements Disposable {
  private supportedFeatures: Map<string, AWSFeature<AWSSupportedView>> = new Map()
  private resolvedFeature?: AWSFeature<AWSSupportedView> | undefined
  constructor(private cell: TextDocument) {
    this.supportedFeatures.set('/ec2/details', {
      view: AWSSupportedView.EC2InstanceDetails,
      data: {
        urlRegex: /ec2\/home[?]?region=[^#]+#InstanceDetails:instanceId=([^\s&]+)/,
        region: '',
        instanceId: '',
      },
    })

    this.supportedFeatures.set('/ec2/home', {
      view: AWSSupportedView.EC2Instances,
      data: {
        region: '',
      },
    })

    const text = this.cell.getText()
    if (text.includes('console.aws.amazon.com')) {
      const url = new URL(text)
      let supportedFeature: AWSFeature<AWSSupportedView> | null = null
      for (const [key, feature] of this.supportedFeatures) {
        if (feature.data.urlRegex?.test(text) || key === url.pathname) {
          supportedFeature = feature
          break
        }
      }
      if (supportedFeature) {
        if (supportedFeature.data.urlRegex && supportedFeature.data) {
          if (supportedFeature.view === AWSSupportedView.EC2InstanceDetails) {
            const instanceMatch = /instanceId=([^&]+)/.exec(url.toString())
            if (instanceMatch) {
              supportedFeature.data.instanceId = instanceMatch[0].split('=')[1]
            }
            const regionMatch = /region=([^&]+)/.exec(url.toString())
            if (regionMatch) {
              supportedFeature.data.region = regionMatch[1].split('#')[0]
            }
          }
          const matches = supportedFeature.data.urlRegex.exec(url.pathname)
          if (matches) {
            const [, ...fields] = matches
            Object.keys(supportedFeature.data).forEach((field, index) => {
              supportedFeature!.data![field] = fields[index]
            })
          }
        }
        supportedFeature.data.region = url.searchParams.get('region')
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
