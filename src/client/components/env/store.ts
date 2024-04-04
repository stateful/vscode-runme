import { Disposable } from 'vscode'
import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { when } from 'lit/directives/when.js'

import '../table'
import '../envViewer'
import '../tooltip'

import { formatDate, formatDateWithTimeAgo } from '../../utils'
import { SnapshotEnv } from '../../../types'
import { CustomErrorIcon } from '../icons/error'
import { MonitorEnvStoreResponseSnapshot_Status } from '../../../extension/grpc/runner/v1'

const RUNME_ENV_VARS_NAME = '__'

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

const HIDDEN_COLUMNS = ['resolvedValue', 'errors', 'status']

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
            status: variable.status,
            originalValue: variable.originalValue,
            spec: variable.spec,
            origin: variable.origin,
            updatedAt: formatDate(new Date(variable.updateTime)),
            createdAt: formatDate(new Date(variable.createTime)),
            resolvedValue: variable.resolvedValue,
            errors: variable.errors,
          }
        })}"
        .displayable="${(row: SnapshotEnv, field: string) => {
          return !HIDDEN_COLUMNS.includes(field)
        }}"
        .hasErrors="${(row: SnapshotEnv) => {
          if (!row.errors?.length || row.name === RUNME_ENV_VARS_NAME) {
            return false
          }
          return true
        }}"
        .renderer="${(row: SnapshotEnv, field: string) => {
          switch (field) {
            case 'originalValue':
              const displaySecret = row.status === MonitorEnvStoreResponseSnapshot_Status.LITERAL
              let val =
                row.status === MonitorEnvStoreResponseSnapshot_Status.MASKED
                  ? `${row.resolvedValue} [masked]`
                  : row.resolvedValue

              let resolvedValue = row.resolvedValue
              if (row.status === MonitorEnvStoreResponseSnapshot_Status.UNSPECIFIED) {
                val = '[unset]'
                resolvedValue = '[unset]'
              } else if (row.status === MonitorEnvStoreResponseSnapshot_Status.HIDDEN) {
                val = row.originalValue
              }

              return html`<env-viewer
                .displaySecret="${displaySecret}"
                .value="${val}"
                .maskedValue="${resolvedValue}"
                .status="${row.status}"
                @onCopy="${async () => {
                  return this.#copy(row.originalValue)
                }}"
              ></env-viewer>`
            case 'createdAt':
              return html`${row.createdAt ? formatDateWithTimeAgo(new Date(row.createdAt)) : ''}`
            case 'updatedAt':
              return html`${row.updatedAt ? formatDate(new Date(row.updatedAt)) : ''}`
            case 'name':
              return when(
                row.errors?.length,
                () =>
                  html`<div class="flex">
                    <tooltip-text
                      .tooltipText="${html`<div class="flex">
                        ${row.errors.map(
                          (error) => html`<span>${CustomErrorIcon(10, 10)}${error.message}</span>`,
                        )}
                      </div>`}"
                      .value="${html`${CustomErrorIcon(10, 10)}`}"
                    ></tooltip-text>
                    <div>${row[field]}</div>
                  </div>`,
                () => html`${row[field]}`,
              )
            default:
              return html`${row[field]}`
          }
        }}"
      ></table-view>
    </div>`
  }
}
