import { css } from 'lit'

/* eslint-disable */
export default css`
  .loading-bar {
    position: relative;
    border-bottom: 2px solid var(--vscode-settings-rowHoverBackground);
    animation: loading-animation 1s infinite;
    height: 1px;
    background-color: var(--vscode-progressBar-background);
  }

  @keyframes loading-animation {
    0% {
      width: 0;
    }
    100% {
      width: 100%;
    }
  }
`
