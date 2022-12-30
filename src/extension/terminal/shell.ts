import os from 'node:os'
import { spawn, SpawnOptions } from 'node:child_process'

import { ShellQuotedString, ShellQuoting, CancellationToken } from 'vscode'

type CommandLineArgs = Array<ShellQuotedString>

/**
 * A {@link Shell} class applies quoting rules for a specific shell.
 * Quoth the cmd.exe 'nevermore'.
 */
export abstract class Shell {
  public static getShellOrDefault(shell?: Shell | null | undefined): Shell {
    if (shell) {
      return shell
    }

    if (os.platform() === 'win32') {
      return new Powershell()
    } else {
      return new Bash()
    }
  }

  /**
   * Expands ShellQuotedString for a specific shell
   * @param args Array of {@link CommandLineArgs} to expand
   */
  public abstract quote(args: CommandLineArgs): Array<string>

  /**
   * Apply shell specific escaping rules to a Go Template string
   * @param arg The string to apply Go Template specific escaping rules for a given shell
   * @param quoting A {@link ShellQuotedString} that is properly escaped for Go Templates in the given shell
   */
  public goTemplateQuotedString(arg: string, quoting: ShellQuoting): ShellQuotedString {
    return {
      value: arg,
      quoting,
    }
  }

  public getShellOrDefault(shell?: string | boolean): string | boolean | undefined {
    return shell
  }
}

/**
 * Quoting/escaping rules for Powershell shell
 */
export class Powershell extends Shell {
  public quote(args: CommandLineArgs): Array<string> {
    const escape = (value: string) => `\`${value}`

    return args.map((quotedArg) => {
      switch (quotedArg.quoting) {
        case ShellQuoting.Escape:
          return quotedArg.value.replace(/[ "'()]/g, escape)
        case ShellQuoting.Weak:
          return `"${quotedArg.value.replace(/["]/g, escape)}"`
        case ShellQuoting.Strong:
          return `'${quotedArg.value.replace(/[']/g, escape)}'`
      }
    })
  }

  public override goTemplateQuotedString(arg: string, quoting: ShellQuoting): ShellQuotedString {
    switch (quoting) {
      case ShellQuoting.Escape:
        return { value: arg, quoting }
      case ShellQuoting.Weak:
      case ShellQuoting.Strong:
        return {
          value: arg.replace(/["]/g, (value) => `\\${value}`),
          quoting,
        }
    }
  }

  public override getShellOrDefault(shell?: string | boolean | undefined): string | boolean | undefined {
    if (typeof shell !== 'string' && shell !== false) {
      return 'powershell.exe'
    }

    return shell
  }
}

/**
 * Quoting/escaping rules for bash/zsh shell
 */
export class Bash extends Shell {
  public quote(args: CommandLineArgs): Array<string> {
    const escape = (value: string) => `\\${value}`

    return args.map((quotedArg) => {
      switch (quotedArg.quoting) {
        case ShellQuoting.Escape:
          return quotedArg.value.replace(/[ "']/g, escape)
        case ShellQuoting.Weak:
          return `"${quotedArg.value.replace(/["]/g, escape)}"`
        case ShellQuoting.Strong:
          return `'${quotedArg.value.replace(/[']/g, escape)}'`
      }
    })
  }
}

export type StreamSpawnOptions = SpawnOptions & {
  cancellationToken?: CancellationToken
  shellProvider?: Shell

  stdInPipe?: NodeJS.ReadableStream
  stdOutPipe?: NodeJS.WritableStream
  stdErrPipe?: NodeJS.WritableStream
}

export async function spawnStreamAsync(
  command: string,
  args: Array<string>,
  options: StreamSpawnOptions,
): Promise<number> {
  // Force PowerShell as the default on Windows, but use the system default on *nix
  const shell = options.shellProvider?.getShellOrDefault(options.shell) ?? options.shell

  if (options.cancellationToken?.isCancellationRequested) {
    throw new Error('Command cancelled')
  }

  const childProcess = spawn(
    command,
    args,
    {
      ...options,
      shell,
      // Ignore stdio streams if not needed to avoid backpressure issues
      stdio: [
        options.stdInPipe ? 'pipe' : 'ignore',
        options.stdOutPipe ? 'pipe' : 'ignore',
        options.stdErrPipe ? 'pipe' : 'ignore',
      ],
    },
  )

  if (options.stdInPipe && childProcess.stdin) {
    options.stdInPipe.pipe(childProcess.stdin)
  }

  if (options.stdOutPipe && childProcess.stdout) {
    childProcess.stdout.pipe(options.stdOutPipe)
  }

  if (options.stdErrPipe && childProcess.stderr) {
    childProcess.stderr.pipe(options.stdErrPipe)
  }

  return new Promise<number>((resolve, reject) => {
    const disposable = options.cancellationToken?.onCancellationRequested(() => {
      childProcess.removeAllListeners()
      childProcess.kill()
      reject(new Error('Command cancelled'))
    })

    // Reject the promise on an error event
    childProcess.on('error', (err) => {
      disposable?.dispose()
      reject(err)
    })

    // Complete the promise when the process exits
    childProcess.on('exit', (code) => {
      disposable?.dispose()
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Process exited with code ${code}`))
      }
    })
  })
}
