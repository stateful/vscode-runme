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