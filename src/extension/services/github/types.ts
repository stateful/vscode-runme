import { StringIndexable } from '../../../types'

export interface IWorkflowDispatchOptions {
  owner: string
  repo: string
  workflow_id: string
  ref: string
  inputs: Record<string, string>
}

export interface IWorkflowYamlContentRequest {
  owner: string
  repo: string
  name: string
}

export interface IWorkflowRun {
  id: number
  workflowId: number
  cancel_url: string
  display_title: string
  head_branch: string
  html_url: string
  name: string
  status: string
  conclusion: string
  workflow_id: string
  logs_url: string
  jobs_url: string
  run_attempt: number
  run_number: number
  run_started_at: string
  actor: {
    login: string
    avatar_url: string
  }
}

export type WorkflowRunFilter = Pick<IWorkflowDispatchOptions, 'owner' | 'repo'> & {
  run_id: number
}

export type WorkflowDispatchType = 'environment' | 'choice' | 'boolean' | 'number' | 'string'
export interface WorkflowDispatchInput extends StringIndexable {
  type: WorkflowDispatchType
  default: string
  description: string
  required: boolean
}

export interface WorkflowDispatch {
  on: {
    workflow_dispatch: {
      inputs: WorkflowDispatchInput
    }
  }
}

export interface WorkflowYAMLFile {
  raw: string
  parsed: Partial<WorkflowDispatch>
}

export interface RepositoryEnvironment {
  html_url: string
  id: number
  name: string
}

export interface RepositoryEnvironments {
  total_count: number
  environments: RepositoryEnvironment[]
}
