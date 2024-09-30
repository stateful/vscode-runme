export * from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v2/runner_pb'
export * as progconf from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/runner/v2/config_pb'

const versions = ['v2']

export function matches(version: string) {
  return versions.find((v) => v === version)
}
