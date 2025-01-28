import { Disposable, NotebookCell, NotebookEditor } from 'vscode'
import { mergeMap, withLatestFrom } from 'rxjs/operators'
import { Observable, Subject, Subscription, from, of } from 'rxjs'

import { APIMethod } from '../types'
import { ClientMessages } from '../constants'

import { ConnectSerializer } from './serializer'
import { Kernel } from './kernel'
import { RunmeEventInputType } from './__generated-platform__/graphql'
import getLogger from './logger'
import { StatefulAuthProvider, StatefulAuthSession } from './provider/statefulAuth'
import AuthSessionChangeHandler from './authSessionChangeHandler'

export interface CellRun {
  cell: { id: any }
  editor: NotebookEditor
  notebook: { id: string; path: string }
  executionSummary: {
    success: boolean
    timing: { elapsedTime: number; startTime: string; endTime: string }
  }
}

const log = getLogger('SignedIn')

export class SignedIn implements Disposable {
  #subscriptions: Subscription[] = []
  readonly #cellRuns = new Subject<CellRun>()

  constructor(protected readonly kernel: Kernel) {
    const signedIn$ = new Observable<boolean>((observer) => {
      const nextSession = (p?: Promise<StatefulAuthSession | undefined>) => {
        return p?.then((session) => observer.next(!!session)).catch(() => observer.next(false))
      }

      AuthSessionChangeHandler.instance.addListener(() => {
        return nextSession(StatefulAuthProvider.instance.currentSession())
      })

      // initial value
      nextSession(StatefulAuthProvider.instance.currentSession())
    })

    const cellRuns$ = this.#cellRuns.pipe(
      withLatestFrom(signedIn$),
      mergeMap(([cellRun, active]) => {
        if (!active) {
          log.info('Discarded cell run reporting because user is not signed in')
          return of(false)
        }

        const p = this.kernel.handleRendererMessage({
          editor: cellRun.editor,
          message: {
            output: {
              data: {
                type: RunmeEventInputType.RunCell,
                cell: cellRun.cell,
                notebook: cellRun.notebook,
                executionSummary: cellRun.executionSummary,
              },
              id: '',
              method: APIMethod.TrackRunmeEvent,
            },
            type: ClientMessages.platformApiRequest,
          },
        })

        return from(p.then(() => true).catch(() => false))
      }),
    )

    this.#subscriptions.push(cellRuns$.subscribe())
  }

  enqueueCellRun(
    cell: NotebookCell,
    editor: NotebookEditor | undefined,
    successfulCellExecution: boolean,
    startTime: number,
    endTime: number,
  ): void {
    const frontmatter = ConnectSerializer.marshalFrontmatter(cell.notebook.metadata, this.kernel)

    const notebookRunmeId = frontmatter.runme?.id
    const cellRunmeId = cell.metadata['runme.dev/id']

    if (!notebookRunmeId) {
      log.warn('notebook runme ID not found')
      return
    }

    if (!cellRunmeId) {
      log.warn('cell runme ID not found')
      return
    }

    if (!editor) {
      log.warn('no active notebook editor')
      return
    }

    this.#cellRuns.next({
      cell: {
        id: cellRunmeId,
      },
      editor: editor,
      notebook: {
        id: notebookRunmeId,
        path: cell.notebook.uri.path,
      },
      executionSummary: {
        success: successfulCellExecution,
        timing: {
          elapsedTime: endTime - startTime,
          // Convert to string to handle integers larger than 32 bits
          startTime: `${startTime}`,
          endTime: `${endTime}`,
        },
      },
    })
  }

  dispose() {
    this.#subscriptions.forEach((sub) => sub.unsubscribe())
  }
}
