import { Disposable } from 'vscode'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '../table'
import '../envViewer'
import { StoredEnvVar } from '../../../types'

const COLUMNS = [
  {
    text: 'Name',
  },
  {
    text: 'Value',
  },
  {
    text: 'Type',
  },
  {
    text: 'Size',
  },
]

@customElement('env-store')
export default class Table extends LitElement {
  protected disposables: Disposable[] = []

  @property({ type: Array })
  variables: StoredEnvVar[] | undefined

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  #copy(content: string) {
    return navigator.clipboard.writeText(content)
  }

  render() {
    return html` <div>
      <table-view
        .columns="${COLUMNS}"
        .rows="${this.variables?.map((variable: StoredEnvVar) => {
          return {
            ...variable,
            actions: '',
          }
        })}"
        .displayable="${() => {
          return true
        }}"
        .renderer="${(row: StoredEnvVar, field: string) => {
          switch (field) {
            case 'value':
              return html`<env-viewer
                .displaySecret="${false}"
                .value="${row.value}"
                .type="${row.type}"
                @onCopy="${async () => {
                  return this.#copy(row.value)
                }}"
              ></env-viewer>`
            default:
              return html`${row[field]}`
          }
        }}"
      ></table-view>
    </div>`
  }
}
