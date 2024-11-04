import { Disposable } from 'vscode'
import { LitElement, TemplateResult, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

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
    text: 'Description',
  },
  {
    text: 'Spec',
  },
  {
    text: 'Source',
  },
  {
    text: 'Updated',
  },
  // {
  //   text: 'Created',
  // },
]

const HIDDEN_COLUMNS = ['resolvedValue', 'errors', 'status', 'specClass']

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

  #sort() {
    this.variables?.sort((a, b) => {
      if (a.errors.length > 0) {
        return -1
      }
      if (b.errors.length > 0) {
        return 1
      }
      return 0
    })
  }

  render() {
    this.#sort()

    return html` <div>
      <table-view
        .columns="${COLUMNS}"
        .rows="${this.variables?.map((v: SnapshotEnv) => {
          return {
            name: v.name,
            status: v.status,
            originalValue: v.originalValue,
            description: v.description,
            spec: v.spec,
            specClass: v.isRequired ? 'required' : 'optional',
            source: v.origin,
            updatedAt: formatDate(new Date(v.updateTime)),
            // createdAt: formatDate(new Date(v.createTime)),
            resolvedValue: v.resolvedValue,
            errors: v.errors,
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

              if (row.status === MonitorEnvStoreResponseSnapshot_Status.UNSPECIFIED) {
                val = '[unset]'
              } else if (row.status === MonitorEnvStoreResponseSnapshot_Status.HIDDEN) {
                val = '[hidden]'
              }
              val = val.replaceAll('\n', ' ').replaceAll('\r', '')

              return html`<env-viewer
                .displaySecret="${displaySecret}"
                .value="${row.originalValue}"
                .maskedValue="${this.#renderValue(row, field, () => val)}"
                .status="${row.status}"
                @onCopy="${async () => {
                  return this.#copy(row.originalValue)
                }}"
              ></env-viewer>`
            // case 'createdAt':
            //   return this.#renderValue(row, field, () =>
            //     row[field] ? formatDateWithTimeAgo(new Date(row[field])) : '',
            //   )
            case 'updatedAt':
              return this.#renderValue(row, field, () =>
                row[field] ? formatDateWithTimeAgo(new Date(row[field])) : '',
              )
            case 'spec':
              return this.#renderValue(row, field, () => {
                return html`<span class="${row.specClass}">${row[field]}</span>`
              })
            default:
              return this.#renderValue(row, field, () => row[field])
          }
        }}"
      ></table-view>
    </div>`
  }

  #renderValue(
    row: SnapshotEnv,
    field: string,
    format: () => TemplateResult<1> | string,
  ): TemplateResult<1> {
    const icon = field === 'name' ? html`${CustomErrorIcon(10, 10)}` : html``

    if (row.errors?.length) {
      return html`<div class="flex">
        <tooltip-text
          .tooltipText="${html`<div class="flex">
            ${row.errors.map((error) => html`<span>${icon}${error.message}</span>`)}
          </div>`}"
          .value="${html`${icon} ${format()}`}"
        ></tooltip-text>
      </div>`
    }

    if (field === 'spec') {
      // if (!['Opaque', 'Plain', 'Secret', 'Password'].includes(row.spec)) {
      //   return html`${format()}
      //     <vscode-button appearance="icon" class="cursor-pointer">${AntennaIcon}</vscode-button>`
      // }
      return html`<div class="flex">
        <tooltip-text
          .tooltipText="${html`<div class="flex">Info: Variable is ${row.specClass}</div>`}"
          .value="${format()}"
        ></tooltip-text>
      </div>`
    }

    return html`${format()}`
  }
}
