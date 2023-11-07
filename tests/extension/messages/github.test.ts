import { AuthenticationSession, authentication, notebooks } from 'vscode'
import { expect, vi, test } from 'vitest'

import handleGitHubMessage from '../../../src/extension/messages/github'
import { ClientMessages } from '../../../src/constants'

vi.mock('vscode')
vi.mock('vscode-telemetry')
class OctokitMock {
  protected rest: any
  constructor() {
    this.rest = {
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: {
            content: 'yaml content here ...',
          },
        }),
      },
      actions: {
        createWorkflowDispatch: vi.fn().mockResolvedValue({}),
        listWorkflowRuns: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            workflow_runs: {},
          },
        }),
        getWorkflowRun: vi.fn().mockResolvedValue({
          data: {
            status: 'completed',
            conclusio: 'success',
          },
        }),
      },
    }
  }
}

vi.mock('octokit', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => new OctokitMock()),
  }
})

vi.mock('../executors/github/workflows', () => {
  return {
    deployWorkflow: vi.fn().mockResolvedValue({
      itFailed: false,
      workflowRun: {
        id: 3232,
        workflowId: 3434,
        display_title: 'release',
        head_branch: 'main',
        name: 'release',
        status: 'queued',
        workflow_id: '432434',
        run_attempt: 0,
        run_number: 1,
        actor: {
          login: 'stateful',
        },
      },
    }),
  }
})

test('Handle GitHub messages', async () => {
  const messaging = notebooks.createRendererMessaging('runme-renderer')
  const authenticationSession: AuthenticationSession = {
    accessToken: '',
    id: '',
    scopes: ['repo'],
    account: {
      id: '',
      label: '',
    },
  }
  vi.mocked(authentication.getSession).mockResolvedValue(authenticationSession)
  await handleGitHubMessage({
    messaging,
    message: {
      type: ClientMessages.githubWorkflowDispatch,
      output: {
        ref: 'main',
        repo: 'vscode-runme',
        owner: 'stateful',
        workflow_id: 'release.yml',
        cellId: 'id',
        inputs: {
          releaseType: 'patch',
          releaseChannel: 'stage',
        },
      },
    },
  })

  expect(messaging.postMessage).toHaveBeenCalledTimes(2)
})
