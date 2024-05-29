import { google } from '@google-cloud/run/build/protos/protos'

import { StringIndexable } from '../../../../types'

export interface CloudRunListServiceOptions {
  project: string
  location: string
}

export interface CloudRunListRevisionsOptions {
  project: string
  service: string
  location?: string | undefined
}

export interface CloudRunContainer {
  name: string
  port: number | null | undefined
  startupCpuBoost: boolean | null | undefined
  cpu: string | undefined
  memory: string | undefined
  image: string
  artifactRegistryUrl: string
  env: google.cloud.run.v2.IEnvVar[] | null | undefined
}

export interface Revision extends StringIndexable {
  containers?: CloudRunContainer[]
  createTime: string | undefined
  uuid: string | null | undefined
  name: string | null | undefined
  service: string | null | undefined
  concurrency: number | null | undefined
  executionEnvironment: google.cloud.run.v2.ExecutionEnvironment | string | undefined | null
  logUri: string | null | undefined
  timeout: string | undefined
  autoScaling: {
    minInstances: number | null | undefined
    maxInstances: number | null | undefined
  }
}
