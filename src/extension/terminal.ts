import { spawn } from 'node:child_process'

import split2 from 'split2'
import { Pseudoterminal, Event, EventEmitter, CancellationTokenSource, window } from 'vscode'

import { RunmeTaskDefinition } from '../types'

interface PromiseOptions {
  resolve: (value: number) => void
  reject: (reason?: any) => void
}

export class ExperimentalTerminal implements Pseudoterminal {
  private writeEmitter = new EventEmitter<string>()
  private closeEmitter = new EventEmitter<number>()
  private readonly cts: CancellationTokenSource = new CancellationTokenSource()

  onDidWrite: Event<string> = this.writeEmitter.event
  onDidClose?: Event<number> = this.closeEmitter.event
  // onDidOverrideDimensions?: Event<vscode.TerminalDimensions | undefined> | undefined
  // onDidChangeName?: Event<string> | undefined

  constructor (
    private definition: RunmeTaskDefinition,
    private promise: PromiseOptions
  ) {}

  private write(message: string, color = ''): void {
    /**
     * The carriage return (/r) is necessary or the pseudoterminal does
     * not return back to the start of line
     */
    message = message.replace(/\r?\n/g, '\r\n')
    this.writeEmitter.fire(`\x1b[${color}${message}\x1b[0m`)
  }

  open(/*initialDimensions: TerminalDimensions | undefined*/): void {
    this.write(`Execute Runme command "${this.definition.command}"`, '0;1m')
    const start = Date.now()
    // ToDo(Christian): either replace with communication protocol
    const child = spawn('/opt/homebrew/bin/runme', ['run', this.definition.command], {
      cwd: this.definition.cwd,
      shell: true,
      env: process.env
    })

    /**
     * handle output for stdout and stderr
     */
    function handleEmitter(emitter: EventEmitter<string>) {
      return (data: Buffer) => {
        emitter.fire('\r\n' + data.toString().trim())
      }
    }

    this.writeEmitter.event((input: string) => {
      child.stdin.write(Buffer.from(input, 'utf-8'))
    })
    const output = handleEmitter(this.writeEmitter)
    child.stdout.pipe(split2()).on('data', output)
    child.stderr.pipe(split2()).on('data', output)
    if (this.definition.stdoutEvent) {
      child.stdout.pipe(split2()).on('data', (stdout) => (
        this.definition.stdoutEvent?.emit('stdout', stdout.toString() + '\n'))
      )
      child.stderr.pipe(split2()).on('data', (stdout) => (
        this.definition.stdoutEvent?.emit('stderr', stdout.toString() + '\n'))
      )
    }

    // if (this.definition.readable && child.stdin) {
    //   this.definition.readable.pipe(child.stdin)
    // }

    child.on('exit', (code) => {
      const exitCode = code ?? -1
      this.write(`\nFinished Runme command after ${Date.now() - start}ms with exit code ${code}\n\n`, '0;1m')
      setTimeout(() => {
        this.close(exitCode)
        if (this.definition.taskPromise) {
          return this.promise.resolve(exitCode)
        }
      })
    })
  }

  close(code?: number): void {
    this.closeEmitter.fire(code || 0)
    this.cts.cancel()

    if (this.definition.closeTerminalOnSuccess && code === 0) {
      window.activeTerminal?.hide()
    }
  }

  handleInput(data: string): void {
    if (data === '\x03') {
      this.closeEmitter.fire(-1)
    }
    this.write(data)
  }
}
