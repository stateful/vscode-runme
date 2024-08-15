export * from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v2alpha1/runner_pb'
export * as progconf from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v2alpha1/config_pb'

const versions = ['v2alpha1', 'v2']

export function matches(version: string) {
  return versions.find((v) => v === version)
}
