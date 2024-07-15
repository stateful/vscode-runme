import { css } from 'lit'
/* eslint-disable */

export const clusterStyles = css`
  vscode-button {
    color: var(--vscode-button-foreground);
    background-color: var(--vscode-button-background);
    transform: scale(0.9);
  }

  vscode-button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  table {
    box-sizing: border-box;
    margin: 0px;
    padding: 0px;
    font-weight: 400;
    line-height: 20px;
    text-indent: 0px;
    vertical-align: baseline;
  }

  .action-notice {
    position: relative;
    border-bottom: 2px solid var(--vscode-settings-rowHoverBackground);
    animation-name: action-notice;
    animation-duration: 2s;
    animation-iteration-count: 2;
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

  .integration {
    display: flex;
    margin: 10px 0;
    gap: 2px;
    align-items: center;
    font-weight: 400;
    font-size: 18px;
  }

  .footer {
    display: flex;
    place-content: center flex-end;
    margin-top: 10px;
    align-items: baseline;
  }

  .footer .link {
    font-size: 10px;
    padding: 0 5px;
  }

  .tab,
  .panel {
    color: var(--vscode-editor-foreground);
  }

  .active-tab {
    color: var(--vscode-textLink-activeForeground);
    fill: currentcolor;
    border-bottom: solid 2px var(--vscode-activityBarTop-activeBorder);
  }

  .cluster-view {
    width: 100%;
  }

  .cluster-view tbody tr {
    text-align: left;
  }

  .cluster-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    border-top: solid 1px var(--vscode-editorInlayHint-foreground);
    border-bottom: solid 1px var(--vscode-editorInlayHint-foreground);
    border-left: none;
    border-right: none;
  }

  tbody tr {
    text-align: left;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 10px;
    place-content: center;
  }

  .flex {
    display: flex;
    align-items: left;
    gap: 8px;
  }

  .flex-column {
    flex-direction: column;
  }
`
