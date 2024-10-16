import { LitElement, TemplateResult, css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

export interface Column {
  text: string
  colspan?: number | undefined
}

@customElement('table-view')
export class Table extends LitElement {
  @property({ type: Array })
  columns?: Column[] = []

  @property({ type: Array })
  rows?: Record<string, string>[] = []

  @property({ type: Object })
  renderer?: (row: any, field: string) => TemplateResult<1> = (row: any, field: string) => {
    return html`${row[field]}`
  }
  displayable?: (row: any, field: string) => boolean = () => true
  hasErrors?: (row: any) => boolean = () => false

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
      text-wrap: nowrap;
    }

    .row-error {
      background-color: var(--vscode-inputValidation-errorBackground);
      border: solid 2px var(--vscode-inputValidation-errorBorder);
    }

    .flex {
      display: flex;
      align-items: baseline;
      gap: 1px;
    }

    .status {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      place-content: stretch space-evenly;
    }

    .flex-center {
      align-items: center;
    }
  `

  private get heading() {
    if (!this.columns?.length) {
      return nothing
    }

    return html`
      <thead>
        <tr>
          ${this.columns?.map((colum) => {
            if (typeof colum === 'string') {
              return html`<th>${colum}</th>`
            } else if (typeof colum === 'object') {
              const { text, colspan } = colum
              return html`<th colspan="${colspan || 1}">${text}</th>`
            }
          })}
        </tr>
      </thead>
    `
  }

  render() {
    if (!this.rows?.length && !this.columns?.length) {
      return nothing
    }

    return html`<table>
      ${this.heading}
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
                  this.displayable?.(row, key),
                  () => html`<td>${this.renderer?.(row, key) || row[key]}</td>`,
                  () => nothing,
                ),
              )}
            </tr>`,
        )}
      </tbody>
    </table>`
  }
}
