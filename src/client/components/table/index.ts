import { LitElement, TemplateResult, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

export interface Column {
  text: string
  colspan?: number | undefined
}

@customElement('table-view')
export class Table extends LitElement {
  @property({ type: Array })
  columns?: Column[]

  @property({ type: Array })
  rows?: Record<string, string>[]

  @property({ type: Object })
  renderer?: (row: any, field: string) => TemplateResult<1>
  displayable?: (row: any, field: string) => boolean
  hasErrors?: (row: any) => boolean

  /* eslint-disable */
  static styles = css`
    :host {
      width: 100%;
    }

    .icon {
      width: 13px;
      margin: 0 5px 0 -5px;
      padding: 0;
    }

    table {
      box-sizing: border-box;
      margin: 0px;
      padding: 10px;
      font-weight: 400;
      line-height: 20px;
      text-indent: 0px;
      vertical-align: baseline;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      width: 100%;
      border-collapse: collapse;
    }

    tbody tr {
      text-align: left;
    }

    thead {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      font-weight: 500;
      line-height: 20px;
      height: 20px;
      border: solid 1px var(--vscode-editorInlayHint-foreground);
      border-left: none;
      border-right: none;
    }

    thead tr {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      color: var(--vscode-editor-selectionForeground);
      text-align: left;
    }

    th {
      font-size: 10px;
      cursor: pointer;
      padding: 5px;
    }

    tbody tr {
      background-color: var(--vscode-editor-background);
      border-bottom: solid 1px var(--vscode-editor-inactiveSelectionBackground);
    }

    .label {
      padding: 2px;
      font-size: 8px;
      text-transform: lowercase;
    }

    tbody tr {
      cursor: pointer;
    }

    tbody tr:hover {
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      color: var(--vscode-editor-selectionForeground);
    }

    .actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }

    .flex-column {
      display: flex;
      flex-wrap: nowrap;
      flex-direction: column;
      justify-content: space-around;
      align-items: stretch;
    }

    .list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .grouped-row {
      display: flex;
      flex-wrap: wrap;
      flex-direction: column;
    }

    .long-word {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
    }

    vscode-button {
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      transform: scale(0.9);
    }
    vscode-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    tbody tr td {
      max-width: 100px;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .row-error {
      background-color: var(--vscode-inputValidation-errorBackground);
      border: solid 2px var(--vscode-inputValidation-errorBorder);
    }

    .flex {
      display: flex;
    }
  `

  render() {
    return html`<table>
      <thead>
        <tr>
          ${this.columns?.map(
            ({ text, colspan }) => html`<th colspan="${colspan || 1}">${text}</th>`,
          )}
        </tr>
      </thead>
      <tbody>
        ${this.rows?.map(
          (row) =>
            html`<tr
              class="${when(
                this.hasErrors && this.hasErrors(row),
                () => 'row-error',
                () => '',
              )}"
            >
              ${Object.keys(row).map((key) =>
                when(
                  this.displayable && this.displayable(row, key),
                  () => html`<td>${this.renderer ? this.renderer(row, key) : row[key]}</td>`,
                  () => html``,
                ),
              )}
            </tr>`,
        )}
      </tbody>
    </table>`
  }
}
