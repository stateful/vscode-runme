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