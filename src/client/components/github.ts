import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'
import { Disposable } from 'vscode'

import type { ClientMessage, GitHubState } from '../../types'
import { getContext } from '../utils'
import { ClientMessages } from '../../constants'
import { onClientMessage } from '../../utils/messaging'
import { IWorkflowRun } from '../../extension/services/types'


interface IWorkflow {
  on: any
  name: string
  jobs: any
}

type Event = {
  target: {
    id: string
    value: string
  }
}

enum DeploymentStatus {
  triggered,
  error,
  none
}

@customElement('github-output')
export class GitHubOutput extends LitElement{

  @property()
  protected isTriggeringWorkflow = false

  @property()
  protected deploymentStatus: DeploymentStatus = DeploymentStatus.none

  @property()
  protected reason?: string

  @property()
  workflowRun?: IWorkflowRun

  @property({ type: Object })
  state: GitHubState = {}
  
  protected disposables: Disposable[] = []

  private inputs: Record<string, string> = {}

  // Define scoped styles right with your component, in plain CSS
  /* eslint-disable max-len */
  static styles = css`
    :host {
      display: block;
      font-family: Arial;
      --github-button-background: #238636;
    }

    .github-workflow-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
    }

    .github-workflow-item-container {
      border: 1px solid var(--vscode-focusBorder);
      border-radius: 5px;
      width: 94%;
      position: relative;
    }

    .github-workflow-control::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .github-workflow-control::part(root) {
      background: transparent;
      border:none;
      color: var(--vscode-foreground);
    }

    .github-workflow-control::part(label) {
      color: var(--vscode-foreground);
    }

    .github-workflow-control::part(checked-indicator) {
      fill: var(--vscode-foreground);
    }

    .row {
      width: 100%;
    }

    .github-workflow-control::part(control) {
      background-color: var(--theme-input-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    }

    .dropdown-container {
      box-sizing: border-box;
      display: flex;
      flex-flow: row nowrap;
      align-items: flex-start;
      justify-content: flex-start;
    }
    
    .dropdown-container label {
      display: block;
      color: var(--vscode-foreground);
      cursor: pointer;
      padding: 0.4rem;
      font-size: var(--vscode-font-size);
      line-height: normal;
      margin-bottom: 2px;
    }

    .run-action-footer {
      background-color: var(--vscode-settings-rowHoverBackground);
      padding: 2rem;
      margin-top: 1rem;
    }

    .deploying {
      display: flex;
      gap: 1rem;
      justify-content:center;
    }

    .fade {
      opacity: 0.5;
    }

    .message {
      padding: 1rem;
      border-radius:5px;
      width:100%;
    }

    .success-message {
      color: var(--vscode-editorInfo-foreground);
    }

    .error-message {
      color:var(--vscode-errorForeground)
    }

    .workflow-run {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background-color: var(--vscode-settings-rowHoverBackground);
    }

    .icon {
      background-repeat: no-repeat;
      height:16px;
      width:16px;
    }

    .avatar-user {
      background-color: var(--vscode-settings-rowHoverBackground);
      border-radius: 50%;
      box-shadow: 0 0 0 1px var(--vscode-settings-rowHoverBackground);
      display: inline-block;
      flex-shrink: 0;
      line-height: 1;
      height: 16px;
      width: 16px;
      overflow: hidden;
      vertical-align: middle;
    }

    @media (prefers-color-scheme: dark) {

      .icon-cancelled {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4.91096 1.19221C5.03403 1.06914 5.20095 1 5.375 1H10.625C10.799 1 10.966 1.06914 11.089 1.19221L14.8078 4.91096C14.9309 5.03403 15 5.20095 15 5.375V10.625C15 10.799 14.9309 10.966 14.8078 11.089L11.089 14.8078C10.966 14.9309 10.799 15 10.625 15H5.375C5.20095 15 5.03403 14.9309 4.91096 14.8078L1.19221 11.089C1.06914 10.966 1 10.799 1 10.625V5.375C1 5.20095 1.06914 5.03403 1.19221 4.91096L4.91096 1.19221ZM5.64683 2.3125L2.3125 5.64683V10.3531L5.64683 13.6875H10.3531L13.6875 10.3531V5.64683L10.3531 2.3125H5.64683ZM8 4.5C8.36243 4.5 8.65625 4.79382 8.65625 5.15625V8.21875C8.65625 8.58118 8.36243 8.875 8 8.875C7.63757 8.875 7.34375 8.58118 7.34375 8.21875V5.15625C7.34375 4.79382 7.63757 4.5 8 4.5ZM8 11.5C8.48325 11.5 8.875 11.1083 8.875 10.625C8.875 10.1417 8.48325 9.75 8 9.75C7.51676 9.75 7.125 10.1417 7.125 10.625C7.125 11.1083 7.51676 11.5 8 11.5Z' fill='%238B949E'/%3E%3C/svg%3E%0A");
      }

      .icon-failure {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_204_199707)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.05025 12.9497C0.316583 10.2161 0.316583 5.78392 3.05025 3.05025C5.78392 0.316583 10.2161 0.316583 12.9497 3.05025C15.6834 5.78392 15.6834 10.2161 12.9497 12.9497C10.2161 15.6834 5.78392 15.6834 3.05025 12.9497ZM6.27653 5.34846C6.02025 5.09218 5.60474 5.09218 5.34845 5.34846C5.09217 5.60474 5.09217 6.02026 5.34845 6.27654L7.07192 8L5.34845 9.72346C5.09217 9.97974 5.09217 10.3953 5.34845 10.6515C5.60474 10.9078 6.02025 10.9078 6.27653 10.6515L7.99999 8.92808L9.72345 10.6515C9.97973 10.9078 10.3952 10.9078 10.6515 10.6515C10.9078 10.3953 10.9078 9.97974 10.6515 9.72346L8.92807 8L10.6515 6.27654C10.9078 6.02026 10.9078 5.60475 10.6515 5.34847C10.3953 5.09219 9.97973 5.09219 9.72345 5.34847L7.99999 7.07192L6.27653 5.34846Z' fill='%23F85149'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_204_199707'%3E%3Crect width='14' height='14' fill='white' transform='translate(1 1)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
      }

      .icon-skipped {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='18' height='18' viewBox='0 0 18 18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.3125 9C3.3125 5.85888 5.85888 3.3125 9 3.3125C12.1412 3.3125 14.6875 5.85888 14.6875 9C14.6875 12.1412 12.1412 14.6875 9 14.6875C5.85888 14.6875 3.3125 12.1412 3.3125 9ZM9 2C5.134 2 2 5.134 2 9C2 12.866 5.134 16 9 16C12.866 16 16 12.866 16 9C16 5.134 12.866 2 9 2ZM11.8703 7.05779C12.1265 6.80151 12.1265 6.38599 11.8703 6.12971C11.614 5.87343 11.1985 5.87343 10.9422 6.12971L6.12971 10.9422C5.87343 11.1985 5.87343 11.614 6.12971 11.8703C6.38599 12.1265 6.80151 12.1265 7.05779 11.8703L11.8703 7.05779Z' fill='%238B949E'/%3E%3C/svg%3E%0A");
      }

      .icon-stale {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.19701 2.92607C8.11286 2.77212 7.88714 2.77212 7.80299 2.92608L2.36884 12.8679C2.28931 13.0135 2.39713 13.1894 2.56585 13.1894H13.4341C13.6029 13.1894 13.7107 13.0135 13.6311 12.8679L8.19701 2.92607ZM6.62094 2.30829C7.21002 1.23057 8.79 1.23057 9.37907 2.30829L14.8132 12.2502C15.37 13.2687 14.6152 14.5 13.4341 14.5H2.56585C1.38478 14.5 0.630055 13.2687 1.18679 12.2502L6.62094 2.30829ZM8.89354 11.005C8.89354 11.4876 8.4935 11.8788 8.00001 11.8788C7.50653 11.8788 7.10647 11.4876 7.10647 11.005C7.10647 10.5225 7.50653 10.1313 8.00001 10.1313C8.4935 10.1313 8.89354 10.5225 8.89354 11.005ZM8.67016 6.41791C8.67016 6.05599 8.37012 5.7626 8.00001 5.7626C7.6299 5.7626 7.32986 6.05599 7.32986 6.41791V8.60226C7.32986 8.96417 7.6299 9.25756 8.00001 9.25756C8.37012 9.25756 8.67016 8.96417 8.67016 8.60226V6.41791Z' fill='%23D29922'/%3E%3C/svg%3E%0A");
      }
      
      .icon-timed_out {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.19701 2.92607C8.11286 2.77212 7.88714 2.77212 7.80299 2.92608L2.36884 12.8679C2.28931 13.0135 2.39713 13.1894 2.56585 13.1894H13.4341C13.6029 13.1894 13.7107 13.0135 13.6311 12.8679L8.19701 2.92607ZM6.62094 2.30829C7.21002 1.23057 8.79 1.23057 9.37907 2.30829L14.8132 12.2502C15.37 13.2687 14.6152 14.5 13.4341 14.5H2.56585C1.38478 14.5 0.630055 13.2687 1.18679 12.2502L6.62094 2.30829ZM8.89354 11.005C8.89354 11.4876 8.4935 11.8788 8.00001 11.8788C7.50653 11.8788 7.10647 11.4876 7.10647 11.005C7.10647 10.5225 7.50653 10.1313 8.00001 10.1313C8.4935 10.1313 8.89354 10.5225 8.89354 11.005ZM8.67016 6.41791C8.67016 6.05599 8.37012 5.7626 8.00001 5.7626C7.6299 5.7626 7.32986 6.05599 7.32986 6.41791V8.60226C7.32986 8.96417 7.6299 9.25756 8.00001 9.25756C8.37012 9.25756 8.67016 8.96417 8.67016 8.60226V6.41791Z' fill='%23D29922'/%3E%3C/svg%3E%0A");
      }

      .icon-waiting, .icon-pending, .icon-action_required {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_204_199702)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.97833 3.97833C1.75722 6.19944 1.75722 9.80056 3.97833 12.0217C6.19944 14.2428 9.80056 14.2428 12.0217 12.0217C14.2428 9.80056 14.2428 6.19944 12.0217 3.97833C9.80056 1.75722 6.19944 1.75722 3.97833 3.97833ZM3.05025 12.9497C0.316583 10.2161 0.316583 5.78392 3.05025 3.05025C5.78392 0.316583 10.2161 0.316583 12.9497 3.05025C15.6834 5.78392 15.6834 10.2161 12.9497 12.9497C10.2161 15.6834 5.78392 15.6834 3.05025 12.9497Z' fill='%238B949E'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_204_199702'%3E%3Crect width='14' height='14' fill='white' transform='translate(1 1)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
      }

      .icon-success, .icon-completed {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15ZM11.3078 6.49529C11.564 6.23901 11.564 5.82349 11.3078 5.56721C11.0515 5.31093 10.636 5.31093 10.3797 5.56721L6.90625 9.04067L5.62029 7.75471C5.36401 7.49843 4.94849 7.49843 4.69221 7.75471C4.43593 8.01099 4.43593 8.42651 4.69221 8.68279L6.44221 10.4328C6.69849 10.689 7.11401 10.689 7.37029 10.4328L11.3078 6.49529Z' fill='%233FB950'/%3E%3C/svg%3E%0A");
      }
  
      .icon-queued, .icon-requested {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z' fill='%239E6A03'/%3E%3C/svg%3E%0A");
      }

      .icon-in_progress {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath opacity='0.5' fill-rule='evenodd' clip-rule='evenodd' d='M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15ZM8 13.25C10.8995 13.25 13.25 10.8995 13.25 8C13.25 5.1005 10.8995 2.75 8 2.75C5.1005 2.75 2.75 5.1005 2.75 8C2.75 10.8995 5.1005 13.25 8 13.25Z' fill='%23BF8700'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 8C15 8.29633 14.9816 8.58836 14.9458 8.875H13.1774C13.2252 8.59044 13.25 8.29812 13.25 8C13.25 5.1005 10.8995 2.75 8 2.75V1C11.866 1 15 4.13401 15 8Z' fill='%23BF8700'%3E%3CanimateTransform attributeType='xml' attributeName='transform' type='rotate' from='0 8 8' to='360 8 8' dur='2s' additive='sum' repeatCount='indefinite' /%3E%3C/path%3E%3Ccircle cx='8' cy='8' r='3.5' fill='%239E6A03'/%3E%3C/svg%3E%0A");
      }
    }


    @media (prefers-color-scheme: light) {

      .icon-cancelled {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4.91096 1.19221C5.03403 1.06914 5.20095 1 5.375 1H10.625C10.799 1 10.966 1.06914 11.089 1.19221L14.8078 4.91096C14.9309 5.03403 15 5.20095 15 5.375V10.625C15 10.799 14.9309 10.966 14.8078 11.089L11.089 14.8078C10.966 14.9309 10.799 15 10.625 15H5.375C5.20095 15 5.03403 14.9309 4.91096 14.8078L1.19221 11.089C1.06914 10.966 1 10.799 1 10.625V5.375C1 5.20095 1.06914 5.03403 1.19221 4.91096L4.91096 1.19221ZM5.64683 2.3125L2.3125 5.64683V10.3531L5.64683 13.6875H10.3531L13.6875 10.3531V5.64683L10.3531 2.3125H5.64683ZM8 4.5C8.36243 4.5 8.65625 4.79382 8.65625 5.15625V8.21875C8.65625 8.58118 8.36243 8.875 8 8.875C7.63757 8.875 7.34375 8.58118 7.34375 8.21875V5.15625C7.34375 4.79382 7.63757 4.5 8 4.5ZM8 11.5C8.48325 11.5 8.875 11.1083 8.875 10.625C8.875 10.1417 8.48325 9.75 8 9.75C7.51676 9.75 7.125 10.1417 7.125 10.625C7.125 11.1083 7.51676 11.5 8 11.5Z' fill='%238B949E'/%3E%3C/svg%3E%0A");
      }

      .icon-failure {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_204_199707)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.05025 12.9497C0.316583 10.2161 0.316583 5.78392 3.05025 3.05025C5.78392 0.316583 10.2161 0.316583 12.9497 3.05025C15.6834 5.78392 15.6834 10.2161 12.9497 12.9497C10.2161 15.6834 5.78392 15.6834 3.05025 12.9497ZM6.27653 5.34846C6.02025 5.09218 5.60474 5.09218 5.34845 5.34846C5.09217 5.60474 5.09217 6.02026 5.34845 6.27654L7.07192 8L5.34845 9.72346C5.09217 9.97974 5.09217 10.3953 5.34845 10.6515C5.60474 10.9078 6.02025 10.9078 6.27653 10.6515L7.99999 8.92808L9.72345 10.6515C9.97973 10.9078 10.3952 10.9078 10.6515 10.6515C10.9078 10.3953 10.9078 9.97974 10.6515 9.72346L8.92807 8L10.6515 6.27654C10.9078 6.02026 10.9078 5.60475 10.6515 5.34847C10.3953 5.09219 9.97973 5.09219 9.72345 5.34847L7.99999 7.07192L6.27653 5.34846Z' fill='%23F85149'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_204_199707'%3E%3Crect width='14' height='14' fill='white' transform='translate(1 1)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
      }

      .icon-skipped {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='18' height='18' viewBox='0 0 18 18' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.3125 9C3.3125 5.85888 5.85888 3.3125 9 3.3125C12.1412 3.3125 14.6875 5.85888 14.6875 9C14.6875 12.1412 12.1412 14.6875 9 14.6875C5.85888 14.6875 3.3125 12.1412 3.3125 9ZM9 2C5.134 2 2 5.134 2 9C2 12.866 5.134 16 9 16C12.866 16 16 12.866 16 9C16 5.134 12.866 2 9 2ZM11.8703 7.05779C12.1265 6.80151 12.1265 6.38599 11.8703 6.12971C11.614 5.87343 11.1985 5.87343 10.9422 6.12971L6.12971 10.9422C5.87343 11.1985 5.87343 11.614 6.12971 11.8703C6.38599 12.1265 6.80151 12.1265 7.05779 11.8703L11.8703 7.05779Z' fill='%238B949E'/%3E%3C/svg%3E%0A");
      }

      .icon-stale {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.19701 2.92607C8.11286 2.77212 7.88714 2.77212 7.80299 2.92608L2.36884 12.8679C2.28931 13.0135 2.39713 13.1894 2.56585 13.1894H13.4341C13.6029 13.1894 13.7107 13.0135 13.6311 12.8679L8.19701 2.92607ZM6.62094 2.30829C7.21002 1.23057 8.79 1.23057 9.37907 2.30829L14.8132 12.2502C15.37 13.2687 14.6152 14.5 13.4341 14.5H2.56585C1.38478 14.5 0.630055 13.2687 1.18679 12.2502L6.62094 2.30829ZM8.89354 11.005C8.89354 11.4876 8.4935 11.8788 8.00001 11.8788C7.50653 11.8788 7.10647 11.4876 7.10647 11.005C7.10647 10.5225 7.50653 10.1313 8.00001 10.1313C8.4935 10.1313 8.89354 10.5225 8.89354 11.005ZM8.67016 6.41791C8.67016 6.05599 8.37012 5.7626 8.00001 5.7626C7.6299 5.7626 7.32986 6.05599 7.32986 6.41791V8.60226C7.32986 8.96417 7.6299 9.25756 8.00001 9.25756C8.37012 9.25756 8.67016 8.96417 8.67016 8.60226V6.41791Z' fill='%23D29922'/%3E%3C/svg%3E%0A");
      }
      
      .icon-timed_out {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.19701 2.92607C8.11286 2.77212 7.88714 2.77212 7.80299 2.92608L2.36884 12.8679C2.28931 13.0135 2.39713 13.1894 2.56585 13.1894H13.4341C13.6029 13.1894 13.7107 13.0135 13.6311 12.8679L8.19701 2.92607ZM6.62094 2.30829C7.21002 1.23057 8.79 1.23057 9.37907 2.30829L14.8132 12.2502C15.37 13.2687 14.6152 14.5 13.4341 14.5H2.56585C1.38478 14.5 0.630055 13.2687 1.18679 12.2502L6.62094 2.30829ZM8.89354 11.005C8.89354 11.4876 8.4935 11.8788 8.00001 11.8788C7.50653 11.8788 7.10647 11.4876 7.10647 11.005C7.10647 10.5225 7.50653 10.1313 8.00001 10.1313C8.4935 10.1313 8.89354 10.5225 8.89354 11.005ZM8.67016 6.41791C8.67016 6.05599 8.37012 5.7626 8.00001 5.7626C7.6299 5.7626 7.32986 6.05599 7.32986 6.41791V8.60226C7.32986 8.96417 7.6299 9.25756 8.00001 9.25756C8.37012 9.25756 8.67016 8.96417 8.67016 8.60226V6.41791Z' fill='%23D29922'/%3E%3C/svg%3E%0A");
      }

      .icon-waiting, .icon-pending, .icon-action_required {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_204_199702)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.97833 3.97833C1.75722 6.19944 1.75722 9.80056 3.97833 12.0217C6.19944 14.2428 9.80056 14.2428 12.0217 12.0217C14.2428 9.80056 14.2428 6.19944 12.0217 3.97833C9.80056 1.75722 6.19944 1.75722 3.97833 3.97833ZM3.05025 12.9497C0.316583 10.2161 0.316583 5.78392 3.05025 3.05025C5.78392 0.316583 10.2161 0.316583 12.9497 3.05025C15.6834 5.78392 15.6834 10.2161 12.9497 12.9497C10.2161 15.6834 5.78392 15.6834 3.05025 12.9497Z' fill='%238B949E'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_204_199702'%3E%3Crect width='14' height='14' fill='white' transform='translate(1 1)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A");
      }

      .icon-success, .icon-completed {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15ZM11.3078 6.49529C11.564 6.23901 11.564 5.82349 11.3078 5.56721C11.0515 5.31093 10.636 5.31093 10.3797 5.56721L6.90625 9.04067L5.62029 7.75471C5.36401 7.49843 4.94849 7.49843 4.69221 7.75471C4.43593 8.01099 4.43593 8.42651 4.69221 8.68279L6.44221 10.4328C6.69849 10.689 7.11401 10.689 7.37029 10.4328L11.3078 6.49529Z' fill='%233FB950'/%3E%3C/svg%3E%0A");
      }
  
      .icon-queued, .icon-requested {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z' fill='%239E6A03'/%3E%3C/svg%3E%0A");
      }

      .icon-in_progress {
        background-image: url("data:image/svg+xml,%0A%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath opacity='0.5' fill-rule='evenodd' clip-rule='evenodd' d='M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15ZM8 13.25C10.8995 13.25 13.25 10.8995 13.25 8C13.25 5.1005 10.8995 2.75 8 2.75C5.1005 2.75 2.75 5.1005 2.75 8C2.75 10.8995 5.1005 13.25 8 13.25Z' fill='%23BF8700'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 8C15 8.29633 14.9816 8.58836 14.9458 8.875H13.1774C13.2252 8.59044 13.25 8.29812 13.25 8C13.25 5.1005 10.8995 2.75 8 2.75V1C11.866 1 15 4.13401 15 8Z' fill='%23BF8700'%3E%3CanimateTransform attributeType='xml' attributeName='transform' type='rotate' from='0 8 8' to='360 8 8' dur='2s' additive='sum' repeatCount='indefinite' /%3E%3C/path%3E%3Ccircle cx='8' cy='8' r='3.5' fill='%239E6A03'/%3E%3C/svg%3E%0A");
      }
    }

    .action-notice {
      position: relative;
      border-bottom: 2px solid var(--vscode-settings-rowHoverBackground);
      animation-name: action-notice;
      animation-duration: 2s;
      animation-iteration-count: 5;
    }
    
    @keyframes action-notice {
      0% {
        border-color: var(--vscode-settings-rowHoverBackground);
      }
      50% {
        border-color: var(--github-button-background);
      }
      100% {
        border-color: var(--vscode-settings-rowHoverBackground);
      }
    }
    
  `

  private renderSelect(group: string, groupLabel: string, options: string[]) {
    return html`
    <div class="dropdown-container">
    <label slot="label">${groupLabel}</label>
    <vscode-dropdown class="github-workflow-control">
      ${options.map((option: string) => {
      return html`<vscode-option
        value="${option}"
        @click=${(e: Event) => this.setControlValue(group, e)}>
        ${option}
        </vscode-option>`
    })}
    </vscode-dropdown>
    </div>
      `
  }

  private renderTextField(id: string, text: string, description: string = '', placeHolder: string = '') {
    return html`<vscode-text-field
      id="${id}"
      type="text"
      value="${text}"
      placeholder=${placeHolder}
      @change=${(e: Event) => this.setControlValue(id, e)}
      size="50"
      class="github-workflow-control"
    ><label>${description}</label></vscode-text-field>`
  }

  private setControlValue(key: string, e: Event) {
    this.inputs[key] = e.target.value
  }

  /**
   * Executes the GitHub Workflow
   */
  private async onRunWorkflow() {
    this.isTriggeringWorkflow = true
    const ctx = getContext()
    if (!ctx.postMessage) {
      return
    }
    const { owner, repo, workflow_id, ref } = this.state
    ctx.postMessage(<ClientMessage<ClientMessages.githubWorkflowDispatch>>{
      type: ClientMessages.githubWorkflowDispatch,
      output: { inputs: this.inputs, owner, repo, workflow_id, ref: ref ?? 'main' },
    })
  }

  connectedCallback(): void {
    super.connectedCallback()
    const ctx = getContext()
    this.disposables.push(onClientMessage(ctx, (e) => {
      if (e.type === ClientMessages.githubWorkflowDeploy) {
        const { itFailed, reason, workflowRun } = e.output
        this.isTriggeringWorkflow = false
        this.deploymentStatus = itFailed ? DeploymentStatus.error : DeploymentStatus.triggered
        this.reason = reason
        this.workflowRun = workflowRun
      } else if (e.type === ClientMessages.githubWorkflowStatusUpdate) {
        const { workflowRun } = e.output
        this.workflowRun = workflowRun
      }
    })
    )
  }

  private getWorkflowForm() {
    const { on: { workflow_dispatch } } = this.state.content as unknown as IWorkflow
    if (workflow_dispatch) {
      const yamlDefinition = Object.entries(workflow_dispatch.inputs)
      const inputs = yamlDefinition.filter((p: unknown) => typeof p === 'object')
      return inputs.map((option: any) => {
        const [key, { type, options, description, default: defaultValue }] = option
        // Set the default values of the form
        this.inputs[key] = defaultValue
        return html`<div class="row">
          ${when(
          type === 'choice' && options.length <= 3,
          () => this.renderSelect(key, description, options),
          () => html``
        )}
          ${when(
          type === 'string',
          () => this.renderTextField(key, defaultValue, description),
          () => html``
        )}
        </div>`
      })
    }
  }

  private getWorkflowRunStatus() {
    return when(this.deploymentStatus === DeploymentStatus.triggered, () => {
      return html`
              <div class="message success-message">
                <h2>Workflow triggered!</h2>
                <p>The workflow is now running, the status will be updated automatically here.</p>
              </div>
              <div class="workflow-run action-notice">
                <div class="icon icon-${this.workflowRun?.status.toLowerCase()}"></div>
                <div>${this.workflowRun?.display_title} #${this.workflowRun?.run_number}: Manually run by <img class="avatar-user" src="${this.workflowRun?.actor.avatar_url}" /> ${this.workflowRun?.actor.login}</div>
                <div><vscode-link href="${this.workflowRun?.html_url}">Open workflow run</vscode-link></div>
              </div>
              `
    }, () => html``)
  }

  private getFooter() {
    return html`
      <div class="run-action-footer ${this.isTriggeringWorkflow ? 'deploying': ''}">
        ${when(
      this.isTriggeringWorkflow,
      () => html`<vscode-progress-ring></vscode-progress-ring><p>Triggering workflow...</p>`,
      () => html`
            <vscode-button 
                style="color: var(--vscode-button-foreground);
                background-color:var(--github-button-background);"
                @click="${this.onRunWorkflow}">
                Run Workflow
            </vscode-button>`
    )} 
    </div>`
  }

  // Render the UI as a function of component state
  render() {
    const workflowForm = this.getWorkflowForm()
    if (workflowForm) {
      return html`
      <div class="github-workflow-item-container ${this.isTriggeringWorkflow ? 'fade' : ''}">
        ${this.getWorkflowRunStatus()}
        ${when(this.deploymentStatus === DeploymentStatus.error,
        () => html`<div class="message error-message">Failed to trigger workflow:${this.reason}</div>`,
        () => html``)}
        <div class="github-workflow-container">
          ${workflowForm}
        </div>
        ${this.getFooter()}
      </div>
      `
    }

    return html`
    <div class="message error-message"><h2>Error</h2>
      <p>Unsupported GitHub Workflow, please ensure you are specifying an action with workflow_dispatch</p>
    </div>`
  }

}
