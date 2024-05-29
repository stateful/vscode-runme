import { RegionsClient } from '@google-cloud/compute'

export function getGCloudLink(path: string) {
  return `https://console.cloud.google.com/${[path]}`
}

export async function getActiveRegions(project: string): Promise<string[] | undefined> {
  const regionsClient = new RegionsClient()
  const [regions] = await regionsClient.list({
    project,
  })

  if (!regions.length) {
    return
  }

  // Prioritize common used regions to ensure results are returned early on.
  const commonRegions = [
    'us-central1',
    'us-east1',
    'us-west1',
    'us-east5',
    'northamerica-northeast1',
    'europe-west1',
    'europe-north1',
    'northamerica-northeast2',
    'europe-west1',
    'europe-west9',
    'europe-west3',
    'europe-west4',
  ]
  const activeRegions = regions
    .filter((region) => region.status === 'UP')
    .flatMap((region) => region.name!)

  const result = Array.from(new Set(commonRegions.concat(activeRegions)))

  return result
}
