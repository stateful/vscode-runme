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

  private stdoutStream = new PassThrough()
  private stderrStream = new PassThrough()
  private stdinStream = new StdinStream()

  private readonly cts: CancellationTokenSource = new CancellationTokenSource()

  onDidWrite: Event<string> = this.writeEmitter.event
  onDidClose?: Event<number> = this.closeEmitter.event

  constructor (private _notebook: NotebookDocument) {
    this.write(`Runme Session started for file ${this._notebook.uri.fsPath}`)
    this.stdoutStream.on('data', this.#handleOutput(DEFAULT))
    this.stderrStream.on('data', this.#handleOutput(YELLOW))
  }

  async execute (task: RunmeTask, stream?: StreamOptions) {
    this.write(`Execute Runme command #${task.definition.index}`, DEFAULTBOLD)
    const start = Date.now()
    const shellProvider = Shell.getShellOrDefault()

    if (stream?.stdout) {
      this.stdoutStream.pipe(stream.stdout)
    }

    if (stream?.stderr) {
      this.stderrStream.pipe(stream.stderr)
    }

    // ToDo(Christian): either replace with communication protocol
    const exec = spawnStreamAsync('/opt/homebrew/bin/runme', ['run', 'echo-foo'], {
      cancellationToken: this.cts.token,
      stdInPipe: this.stdinStream,
      stdOutPipe: this.stdoutStream,
      stdErrPipe: this.stderrStream,
      shellProvider,
      cwd: task.definition.cwd,
      env: process.env
    })

    exec.then((code) => {
      this.write(`\nFinished Runme command after ${Date.now() - start}ms with exit code ${code}\n\n`, '0;1m')

      if (stream?.stdout) {
        stream.stdout.end()
        this.stdoutStream.unpipe(stream.stdout)
      }

      if (stream?.stderr) {
        stream.stderr.end()
        this.stderrStream.unpipe(stream.stderr)
      }

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

    this.stdinStream.push(Buffer.from(data))
    this.stdoutStream.write(Buffer.from(data))
    // this.definition.stdoutEvent?.emit('stdout')
  }

  #handleOutput (color: string) {
    return (data: Buffer) => this.write(data.toString(), color)
  }
}
