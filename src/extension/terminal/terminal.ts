import { Readable } from 'node:stream'
import type { EventEmitter as NodeEventEmitter } from 'node:events'

import { Pseudoterminal, Event, EventEmitter, CancellationTokenSource, NotebookDocument } from 'vscode'

import { RunmeTaskDefinition } from '../../types'
import type { RunmeTask } from '../provider/runmeTask'

import { spawnStreamAsync, Shell } from './shell'
import { AccumulatorStream } from './stream'

interface PromiseOptions {
  resolve: (value: number) => void
  reject: (reason?: any) => void
}

class StdinStream extends Readable {
  _read(size: number): void {
      console.log('--->', size)

  }
}

export class ExperimentalTerminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>()
  private closeEmitter = new EventEmitter<number>()

  private stdoutStream = new AccumulatorStream()
  private stderrStream = new AccumulatorStream()
  private stdinStream = new StdinStream()

  private readonly cts: CancellationTokenSource = new CancellationTokenSource()

  onDidWrite: Event<string> = this.writeEmitter.event
  onDidClose?: Event<number> = this.closeEmitter.event
  // onDidOverrideDimensions?: Event<vscode.TerminalDimensions | undefined> | undefined
  // onDidChangeName?: Event<string> | undefined

  constructor (private _notebook: NotebookDocument) {}

  execute (task: RunmeTask) {
    this.write(`Execute Runme command "${task.definition.command}"`, '0;1m')
    const start = Date.now()
    const shellProvider = Shell.getShellOrDefault()

    // ToDo(Christian): either replace with communication protocol
    const resultPromise = spawnStreamAsync('/opt/homebrew/bin/runme', ['run', task.definition.command], {
      cancellationToken: this.cts.token,
      stdInPipe: this.stdinStream,
      stdOutPipe: this.stdoutStream,
      stdErrPipe: this.stderrStream,
      shellProvider,
      cwd: this._notebook.uri.fsPath,
      env: process.env
    })

    /**
     * handle output for stdout and stderr
     */
    function handleEmitter(emitter: EventEmitter<string>, stdoutEvent?: NodeEventEmitter) {
      return (data: Buffer) => {
        stdoutEvent?.emit('stdout', data.toString())
        emitter.fire('\r\n' + data.toString().trim())
      }
    }

    const output = handleEmitter(this.writeEmitter, task.definition.stdoutEvent)
    this.stdoutStream.on('data', output)
    this.stderrStream.on('data', output)

    return resultPromise.then((code) => {
      this.write(`\nFinished Runme command after ${Date.now() - start}ms with exit code ${code}\n\n`, '0;1m')
      task.definition.taskPromise.resolve(code)
    }, promise.reject)

    return this
  }

  private write(message: string, color = ''): void {
    /**
     * The carriage return (/r) is necessary or the pseudoterminal does
     * not return back to the start of line
     */
    message = message.replace(/\r?\n/g, '\r\n')
    this.writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`)
  }

  open(/*initialDimensions: TerminalDimensions | undefined*/): void {

  }

  close(code?: number): void {
    this.closeEmitter.fire(code || 0)
    this.cts.cancel()

    // if (this.definition.closeTerminalOnSuccess && code === 0) {
    //   window.activeTerminal?.hide()
    // }
  }

  handleInput(data: string): void {
    if (data === '\x03') {
      return this.closeEmitter.fire(-1)
    }

    this.stdinStream.push(Buffer.from(data))
    this.stdoutStream.write(Buffer.from(data))
    // this.definition.stdoutEvent?.emit('stdout')
  }
}
