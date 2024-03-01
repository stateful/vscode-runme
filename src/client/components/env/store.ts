import { Disposable } from 'vscode'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '../table'
import '../envViewer'
import { EnvVarSpec, StoredEnvVar } from '../../../types'
import { formatDate } from '../../utils'

const COLUMNS = [
  {
    text: 'Name',
  },
  {
    text: 'Value',
  },
  {
    text: 'Spec',
  },
  {
    text: 'Origin',
  },
  {
    text: 'Created',
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
              const displaySecret = row.spec === EnvVarSpec.Secret || row.spec === EnvVarSpec.Plain
              const val = row.spec === EnvVarSpec.Secret ? `${row.value} [masked]` : row.value
              return html`<env-viewer
                .displaySecret="${displaySecret}"
                .value="${val}"
                .spec="${row.spec}"
                @onCopy="${async () => {
                  return this.#copy(row.value)
                }}"
              ></env-viewer>`
            case 'createdAt':
              return html`${row.createdAt ? formatDate(new Date(row.createdAt)) : ''}`
            default:
              return html`${row[field]}`
          }
        }}"
      ></table-view>
    </div>`
  }
}
