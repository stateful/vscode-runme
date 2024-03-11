import { Disposable } from 'vscode'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '../table'
import '../envViewer'

import { formatDate } from '../../utils'
import { SnapshotEnv, SnapshotEnvSpecName } from '../../../types'
import { MonitorEnvResponseSnapshot_Status } from '../../../extension/grpc/runnerTypes'

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
    text: 'Updated',
  },
  {
    text: 'Created',
  },
]

const HIDDEN_COLUMNS = ['resolvedValue']

@customElement('env-store')
export default class Table extends LitElement {
  protected disposables: Disposable[] = []

  @property({ type: Array })
  variables: SnapshotEnv[] | undefined

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
        .rows="${this.variables?.map((variable: SnapshotEnv) => {
          return {
            name: variable.name,
            originalValue: variable.originalValue,
            spec: variable.spec,
            origin: variable.origin,
            updatedAt: formatDate(new Date(variable.updateTime)),
            createdAt: formatDate(new Date(variable.createTime)),
            resolvedValue: variable.resolvedValue,
          }
        })}"
        .displayable="${(row: SnapshotEnv, field: string) => {
          return !HIDDEN_COLUMNS.includes(field)
        }}"
        .renderer="${(row: SnapshotEnv, field: string) => {
          switch (field) {
            case 'originalValue':
              const displaySecret =
                row.spec === SnapshotEnvSpecName.Secret || row.spec === SnapshotEnvSpecName.Plain
              const val =
                row.spec === SnapshotEnvSpecName.Secret
                  ? `${row.originalValue} [masked]`
                  : row.originalValue

              return html`<env-viewer
                .displaySecret="${displaySecret}"
                .value="${val}"
                .spec="${row.spec as SnapshotEnvSpecName}"
                @onCopy="${async () => {
                  return this.#copy(row.originalValue)
                }}"
              ></env-viewer>`
            case 'createdAt':
              return html`${row.createdAt ? formatDate(new Date(row.createdAt)) : ''}`
            case 'updatedAt':
              return html`${row.updatedAt ? formatDate(new Date(row.updatedAt)) : ''}`
            case 'status':
              const statuses: Record<string, string> = Object.entries(
                MonitorEnvResponseSnapshot_Status,
              ).reduce((acc, curr) => {
                const [key, value] = curr
                return { ...acc, [value]: key }
              }, {})

              return html`${statuses[row.status]}`
            default:
              return html`${row[field]}`
          }
        }}"
      ></table-view>
    </div>`
  }
}
