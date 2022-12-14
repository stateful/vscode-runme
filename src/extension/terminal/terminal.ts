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

class StdinStream extends Readable {
  _read(): void {}
}

interface StreamOptions {
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
}

export class ExperimentalTerminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>()
  private closeEmitter = new EventEmitter<number>()

  private readonly cts: CancellationTokenSource = new CancellationTokenSource()

  onDidWrite: Event<string> = this.writeEmitter.event
  onDidClose?: Event<number> = this.closeEmitter.event

  constructor (private _notebook: NotebookDocument) {
    this.write(`Runme Session started for file ${this._notebook.uri.fsPath}`)
  }

  async execute (task: RunmeTask, stream?: StreamOptions) {
    this.write(`Execute Runme command #${task.definition.index}\n`, DEFAULTBOLD)
    const start = Date.now()
    const shellProvider = Shell.getShellOrDefault()

    const stdoutStream = new PassThrough()
    const stderrStream = new PassThrough()
    const stdinStream = new StdinStream()
    stdoutStream.on('data', this.#handleOutput(DEFAULT))
    stderrStream.on('data', this.#handleOutput(YELLOW))

    if (stream?.stdout) {
      stdoutStream.pipe(stream.stdout)
    }

    if (stream?.stderr) {
      stderrStream.pipe(stream.stderr)
    }

    // ToDo(Christian): either replace with communication protocol
    const exec = spawnStreamAsync('/opt/homebrew/bin/runme', ['run', 'echo-foo'], {
      cancellationToken: this.cts.token,
      stdInPipe: stdinStream,
      stdOutPipe: stdoutStream,
      stdErrPipe: stderrStream,
      shellProvider,
      cwd: task.definition.cwd,
      env: process.env
    })

    exec.then((code) => {
      this.write(`\nFinished Runme command after ${Date.now() - start}ms with exit code ${code}\n\n`, '0;1m')

      if (task.definition.closeTerminalOnSuccess && code === 0) {
        window.activeTerminal?.hide()
      }
    })

    task.execution = new CustomExecution(async (): Promise<Pseudoterminal> => this)
    return {
      execution: await tasks.executeTask(task),
      promise: exec
    }
  }

  private write(message: string, color = DEFAULT): void {
    /**
     * The carriage return (/r) is necessary or the pseudoterminal does
     * not return back to the start of line
     */
    message = message.replace(/\r?\n/g, '\r\n')
    this.writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`)
  }

  open(): void {}

  /**
   * run if markdown file gets closed
   */
  close(): void {
    this.closeEmitter.fire(0)
    this.cts.cancel()
  }

  handleInput(data: string): void {
    if (data === '\x03') {
      return this.closeEmitter.fire(-1)
    }

    // this.stdinStream.push(Buffer.from(data))
    // this.stdoutStream.write(Buffer.from(data))
    // this.definition.stdoutEvent?.emit('stdout')
  }

  #handleOutput (color: string) {
    return (data: Buffer) => this.write(data.toString(), color)
  }
}
