import { css } from 'lit'

/* eslint-disable */
export default /*css*/ css`
  :host {
    display: block;
    font-family: Arial;
  }

  .annotation-container {
    padding: 1rem;
    border: 1px solid var(--vscode-focusBorder);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    width: inherited;
    position: relative;
  }

  .annotation-container h4 {
    margin-block: 0;
  }

  .annotation-item::part(control) {
    background-color: var(--theme-input-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
    min-width: fit-content;
    max-width: calc(65% - 10px);
  }

  .annotation-item::part(root) {
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
  }

  .annotation-item::part(label) {
    color: var(--vscode-foreground);
  }

  .annotation-item::part(checked-indicator) {
    fill: var(--vscode-foreground);
  }

  .error-item {
    color: var(--vscode-errorForeground);
  }

  .has-errors,
  .error-container {
    border: solid 1px var(--vscode-errorForeground);
  }

  .error-container {
    padding: 0.1rem;
  }

  .current-value-error {
    padding: 1rem;
  }

  .grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    width: 100%;
  }

  .box {
    width: calc(50% - 10px);
    padding: 4px;
    box-sizing: border-box;
    overflow-x: auto;
    margin-top: 12px;
  }

  .themeText {
    color: var(--vscode-foreground);
  }

  .noSelect {
    user-select: none;
  }

  .row,
  .annotation-dropdown-control {
    width: 100%;
  }

  .annotation-dropdown-control::part(root) {
    background: transparent;
    border: none;
    color: var(--vscode-dropdown-foreground);
  }

  .annotation-dropdown-control::part(label) {
    color: var(--vscode-dropdown-foreground);
  }

  .annotation-dropdown-control::part(checked-indicator) {
    fill: var(--vscode-foreground);
  }

  .annotation-dropdown-control::part(control) {
    color: var(--vscode-dropdown-foreground);
    background-color: var(--vscode-settings-dropdownBackground);
    border: 1px solid var(--vscode-settings-numberInputBorder, transparent);
  }

  .dropdown-container label {
    color: var(--vscode-settings-dropdownForeground);
    margin-bottom: 10px;
  }

  .dropdown-container {
    box-sizing: border-box;
    display: flex;
    flex-flow: column wrap;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
  }

  .dropdown-container select {
    background-color: var(--vscode-settings-dropdownBackground);
    color: var(--vscode-settings-dropdownForeground);
    border-color: var(--vscode-settings-dropdownBorder);
    padding: 4px;
    width: 100%;
    height: calc(100% - (var(--design-unit) * 1px));
  }

  .select-container {
    width: 100%;
  }
`
