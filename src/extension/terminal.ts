import { writeFile, chmod } from 'node:fs/promises'
import { spawn } from 'node:child_process'

import {
  Pseudoterminal,
  TerminalDimensions,
  Event,
  EventEmitter
} from 'vscode'
import { file } from 'tmp-promise'


export class ExperimentalTerminal implements Pseudoterminal {
  private inputEmitter = new EventEmitter<string>()
  private outputEmitter = new EventEmitter<string>()
  onDidWrite: Event<string> = this.outputEmitter.event

  // onDidOverrideDimensions?: Event<vscode.TerminalDimensions | undefined> | undefined
  private closeEmitter = new EventEmitter<number>()
  onDidClose?: Event<number> = this.closeEmitter.event

  // onDidChangeName?: Event<string> | undefined
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open(initialDimensions: TerminalDimensions | undefined): void {
    this.run()
  }

  close(): void {
    this.closeEmitter.fire(-1)
  }

  handleInput(data: string): void {
    console.log(Buffer.from(data, 'utf-8'))
    if (data === '\c') {
      this.closeEmitter.fire(-1)
    }
    this.inputEmitter.fire(data === '\r' ? '\r\n' : data)
  }

  constructor(readonly commandLine: string, readonly options: { cwd: string, env?: { [key: string]: string } }) { }

  protected async run() {
    const scriptFile = await file()
    await writeFile(scriptFile.path, this.commandLine, 'utf-8')
    await chmod(scriptFile.path, 0o775)

    const child = spawn(scriptFile.path, {
      cwd: this.options.cwd,
      shell: true,
      env: {
        ...process.env,
        ...this.options.env
      }
    })

    /**
     * handle output for stdout and stderr
     */
    function handleEmitter(emitter: EventEmitter<string>) {
      return (data: Buffer) => {
        emitter.fire('\r\n' + data.toString().trim())
      }
    }

    this.inputEmitter.event((input: string) => {
      child.stdin.write(Buffer.from(input, 'utf-8'))
    })
    const output = handleEmitter(this.outputEmitter)
    child.stdout.on('data', output)
    child.stderr.on('data', output)
    return !Boolean(await new Promise<number>((resolve) => {
      child.on('exit', (code) => {
        const exitCode = code ?? -1
        this.closeEmitter?.fire(exitCode)
        return resolve(exitCode)
      })
    }))
  }
}
