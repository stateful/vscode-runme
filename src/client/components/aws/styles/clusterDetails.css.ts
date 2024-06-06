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

  .integration {
    display: flex;
    margin: 10px 0;
    gap: 2px;
    align-items: center;
  }

  .long-word {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .row div:first-child,
  .row div:last-child {
    margin-bottom: 5px;
  }

  .integration h1,
  h2,
  h3 {
    font-weight: 400;
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

  .vertical-left-divider {
    border-left: solid 1px var(--link-foreground);
    padding-left: 2px;
  }

  .close-button,
  .close-button:hover {
    border: none;
  }

  .flex {
    display: flex;
  }

  .row {
    flex-direction: row;
  }

  .space-between {
    justify-content: space-between;
  }

  .items-center {
    align-items: center;
  }

  .instance-header {
    background-color: var(--vscode-editorWidget-background);
    border-bottom: solid 1px var(--vscode-editorWidget-border);
    padding: 10px;
  }

  .font-lg {
    font-size: 1.5rem;
  }

  .font-md {
    font-size: 1rem;
  }

  .columns {
    display: flex;
    flex: 1;
    gap: 1;
    flex-wrap: wrap;
    align-content: stretch;
    justify-content: space-between;
    border-bottom: solid 1px var(--vscode-editorWidget-border);
    border-right: solid 1px var(--vscode-editorWidget-border);
  }

  .row {
    display: flex;
    flex-direction: column;
  }

  .column {
    padding: 10px;
    flex: 1;
    border-left: 1px solid var(--vscode-editorWidget-border);
  }

  .bold {
    font-weight: bold;
  }

  .header-actions {
    display: flex;
    align-items: center;
    justify-content: space-around;
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

  .instance-panels {
    background-color: var(--vscode-editorWidget-background);
  }

  .instance-panels .panels {
    border: 1px solid var(--vscode-editorWidget-border);
  }

  .panel-view {
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    margin: 10px 0;
    padding: 0px;
  }

  .panel-view > div {
    width: 100%;
  }

  .panel-view .action-button {
    padding: 5px;
  }

  .flex {
    display: flex;
    align-items: baseline;
    gap: 1px;
  }

  .flex-center {
    align-items: center;
  }
`
