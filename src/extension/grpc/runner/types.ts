import { DuplexStreamingCall } from '@protobuf-ts/runtime-rpc'

import { getServerRunnerVersion } from '../../../utils/configuration'

import * as v2 from './v2alpha1'
import * as v1 from './v1'

export type ResolveProgramResponse_VarResult =
  | v1.ResolveProgramResponse_VarResult
  | v2.ResolveProgramResponse_VarResult

export type ResolveProgramRequest_Mode =
  | v1.ResolveProgramRequest_Mode
  | v2.ResolveProgramRequest_Mode

export const ResolveProgramRequest_ModeEnum = () => {
  if (getServerRunnerVersion() === 'v2alpha1') {
    return v2.ResolveProgramRequest_Mode
  }
  return v1.ResolveProgramRequest_Mode
}

export type CommandMode = v1.CommandMode | v2.progconf.CommandMode

export const CommandModeEnum = () => {
  if (getServerRunnerVersion() === 'v2alpha1') {
    return { TEMP_FILE: v2.progconf.CommandMode.FILE, INLINE_SHELL: v2.progconf.CommandMode.INLINE }
  }
  return v1.CommandMode
}

export type ResolveProgramResponse_Status =
  | v1.ResolveProgramResponse_Status
  | v2.ResolveProgramResponse_Status

export const ResolveProgramResponse_StatusEnum = () => {
  if (getServerRunnerVersion() === 'v2alpha1') {
    return v2.ResolveProgramResponse_Status
  }
  return v1.ResolveProgramResponse_Status
}

export type ExecuteRequest = v1.ExecuteRequest | v2.ExecuteRequest
export type ExecuteResponse = v1.ExecuteResponse | v2.ExecuteResponse

export type ExecuteDuplex = DuplexStreamingCall<ExecuteRequest, ExecuteResponse>

export type Session = v1.Session | v2.Session

export type ExecuteStop = v1.ExecuteStop | v2.ExecuteStop

interface SessionCompat {
  env?: string[]
  envs?: string[]
}

export type CreateSessionRequest = v1.CreateSessionRequest | v2.CreateSessionRequest
export type CreateSessionResponse = (v1.CreateSessionResponse | v2.CreateSessionResponse) & {
  session?: SessionCompat
}

export type GetSessionRequest = v1.GetSessionRequest | v2.GetSessionRequest
export type GetSessionResponse = (v1.GetSessionResponse | v2.GetSessionResponse) & {
  session?: SessionCompat
}

export type ListSessionsRequest = v1.ListSessionsRequest | v2.ListSessionsRequest
export type ListSessionsResponse = v1.ListSessionsResponse | v2.ListSessionsResponse

export type UpdateSessionRequest = v2.UpdateSessionRequest
export type UpdateSessionResponse = v2.UpdateSessionResponse

export type DeleteSessionRequest = v1.DeleteSessionRequest | v2.DeleteSessionRequest
export type DeleteSessionResponse = v1.DeleteSessionResponse | v2.DeleteSessionResponse

export type MonitorEnvStoreRequest = v1.MonitorEnvStoreRequest | v2.MonitorEnvStoreRequest
export type MonitorEnvStoreResponse = v1.MonitorEnvStoreResponse | v2.MonitorEnvStoreResponse

export type ResolveProgramRequest = v1.ResolveProgramRequest | v2.ResolveProgramRequest
export type ResolveProgramResponse = v1.ResolveProgramResponse | v2.ResolveProgramResponse

export type SessionEnvStoreType = v1.SessionEnvStoreType | v2.SessionEnvStoreType

export type Winsize = v1.Winsize | v2.Winsize
