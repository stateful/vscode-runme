import { css } from 'lit'

/* eslint-disable */
export default /*css*/ css`
  vscode-button {
    color: var(--vscode-button-foreground);
    background-color: var(--vscode-button-background);
    transform: scale(0.9);
  }
  vscode-button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  .close-button,
  .close-button:hover {
    border: none;
  }

  .actions {
    display: flex;
    gap: 1;
    align-items: center;
    justify-content: center;
  }
`
