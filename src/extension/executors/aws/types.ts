import { type Cluster } from '@aws-sdk/client-eks'

export interface IndexableCluster extends Cluster {
  [key: string]: any
}
