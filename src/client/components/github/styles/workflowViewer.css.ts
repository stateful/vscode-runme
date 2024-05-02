import { css } from 'lit'

/* eslint-disable */
export default /*css*/ css`
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
    position: relative;
  }

  .workflow-items-container {
    max-width: 50%;
  }

  .github-workflow-control::part(control) {
    background-color: var(--theme-input-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
  }

  .github-workflow-control::part(root) {
    background: transparent;
    border: none;
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
    padding: 5px;
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

  .container {
    background-color: var(--vscode-settings-rowHoverBackground);
    padding: 1rem;
    margin-top: 1rem;
  }

  .branch {
    display: flex;
    align-items: center;
    font-size: 1rem;
    font-weight: bold;
  }

  .deploying {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .fade {
    opacity: 0.5;
  }

  .message {
    padding: 1rem;
    border-radius: 5px;
  }

  .success-message {
    color: var(--vscode-editorInfo-foreground);
  }

  .error-message {
    color: var(--vscode-errorForeground);
  }

  .warning {
    background-color: var(--vscode-inputValidation-warningBackground);
    padding: 1rem;
  }

  .warning .alert {
    color: var(--vscode-editorWarning-foreground);
    margin-bottom: 1rem;
  }
`
