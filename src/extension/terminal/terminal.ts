import path from 'node:path'
import { ChildProcess } from 'node:child_process'
import { Readable, PassThrough } from 'node:stream'

import {
  Pseudoterminal, Event, EventEmitter, CancellationTokenSource,
  NotebookDocument, window, tasks, CustomExecution
} from 'vscode'

import type { RunmeTask } from '../provider/runmeTask'

import { spawnStreamAsync, Shell } from './shell'

const DEFAULT = '0m'
const DEFAULTBOLD = '0;1m'
const YELLOW = '33m'
const END_OF_TEXT = '\x03'
const CR = '\x0D'

class StdinStream extends Readable {
  _read(): void {}
}

interface StreamOptions {
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
}

export class ExperimentalTerminal implements Pseudoterminal {
  #stdinStream = new StdinStream()
  #currentCancellationToken?: CancellationTokenSource
  readonly #writeEmitter = new EventEmitter<string>()
  readonly #closeEmitter = new EventEmitter<number>()
  readonly #processEmitter = new EventEmitter<ChildProcess>()
  readonly #cts: CancellationTokenSource = new CancellationTokenSource()

  onDidWrite: Event<string> = this.#writeEmitter.event
  onDidClose: Event<number> = this.#closeEmitter.event
  onDidStartNewProcess: Event<ChildProcess> = this.#processEmitter.event

  constructor (private _notebook: NotebookDocument) {
    this.write(`Runme Session started for file ${this._notebook.uri.fsPath}`)
    this.#cts.token.onCancellationRequested(this.cancelExecution)
  }

  async execute (task: RunmeTask, stream?: StreamOptions) {
    this.write(`Execute Runme command #${task.definition.command}\n`, DEFAULTBOLD)
    this.#currentCancellationToken = new CancellationTokenSource()
    const start = Date.now()
    const shellProvider = Shell.getShellOrDefault()

    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()
    stdoutStream.on('data', this.#handleOutput(DEFAULT))
    stderrStream.on('data', this.#handleOutput(YELLOW))

    if (stream?.stdout) {
      stdoutStream.pipe(stream.stdout)
      this.#stdinStream.pipe(stream.stdout)
    }

    if (stream?.stderr) {
      stderrStream.pipe(stream.stderr)
    }

    const exec = new Promise<number>((resolve) => {
      task.execution = new CustomExecution(async (): Promise<Pseudoterminal> => {
        // ToDo(Christian): either replace with communication protocol
        const { executionPromise, childProcess } = spawnStreamAsync(
          '/opt/homebrew/bin/runme',
          [
            'run',
            task.definition.command,
            '--chdir', path.dirname(this._notebook.uri.fsPath),
            '--filename', path.basename(this._notebook.uri.fsPath)
          ],
          {
            cancellationToken: this.#currentCancellationToken?.token,
            stdInPipe: this.#stdinStream,
            stdOutPipe: stdoutStream,
            stdErrPipe: stderrStream,
            shellProvider,
            cwd: task.definition.cwd,
            env: process.env
          }
        )

        this.#processEmitter.fire(childProcess)
        executionPromise.then(resolve, () => resolve(1))
        return this
      })
    })

    exec.then((code) => {
      this.#closeEmitter.fire(code)
      this.write(`\nFinished Runme command after ${Date.now() - start}ms with exit code ${code}\n\n`, '0;1m')
      if (task.definition.closeTerminalOnSuccess && code === 0) {
        window.activeTerminal?.hide()
      }
    })

    return {
      execution: await tasks.executeTask(task),
      cancellationToken: this.#currentCancellationToken.token,
      promise: exec
    }
  }

  private write(message: string, color = DEFAULT): void {
    /**
     * The carriage return (/r) is necessary or the pseudoterminal does
     * not return back to the start of line
     */
    message = message.replace(/\r?\n/g, '\r\n')
    this.#writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`)
  }

  open(): void {}

  /**
   * run if markdown file gets closed
   */
  close(): void {
    this.#closeEmitter.fire(0)
    this.#cts.cancel()
  }

  handleInput(data: string): void {
    if (data === END_OF_TEXT) {
      return this.#closeEmitter.fire(-1)
    }

    this.#stdinStream.push(Buffer.from(data))
    this.write(`${data === CR ? '\n' : data}`)
  }

  #handleOutput (color: string) {
    return (data: Buffer) => this.write(data.toString(), color)
  }

  cancelExecution () {
    if (this.#currentCancellationToken?.token.isCancellationRequested) {
      return
    }
    this.#currentCancellationToken?.cancel()
  }
}
