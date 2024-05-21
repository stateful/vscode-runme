/* eslint-disable @typescript-eslint/no-unused-vars */
import { RunProgramOptions } from '../runner'

import { IKernelRunner, IKernelRunnerOptions, resolveProgramOptionsScript } from './runner'

export const uri: IKernelRunner = async ({
  context,
  runner,
  exec,
  runningCell,
  execKey,
  runnerEnv,
  runScript,
}: IKernelRunnerOptions) => {
  const programOptions: RunProgramOptions = await resolveProgramOptionsScript({
    exec,
    execKey,
    runnerEnv,
    runningCell,
    runner,
  })

  // todo(sebastian): move down into kernel?
  switch (programOptions.exec?.type) {
    case 'script':
      {
        const { script } = programOptions.exec
        programOptions.exec.script = `echo "${script}"`
      }
      break
  }

  const program = await runner.createProgramSession(programOptions)
  context.subscriptions.push(program)

  let execRes: string | undefined
  const onData = (data: string | Uint8Array) => {
    if (execRes === undefined) {
      execRes = ''
    }
    execRes += data.toString()
  }

  program.onDidWrite(onData)
  program.onDidErr(onData)
  program.run()

  const success = await new Promise<boolean>((resolve, reject) => {
    program.onDidClose(async (code) => {
      if (code !== 0) {
        return resolve(false)
      }
      return resolve(true)
    })

    program.onInternalErr((e) => {
      reject(e)
    })

    const exitReason = program.hasExited()

    // unexpected early return, likely an error
    if (exitReason) {
      switch (exitReason.type) {
        case 'error':
          {
            reject(exitReason.error)
          }
          break

        case 'exit':
          {
            resolve(exitReason.code === 0)
          }
          break

        default: {
          resolve(false)
        }
      }
    }
  })

  const cellText = success ? execRes?.trim() : undefined
  return runScript?.(cellText) || success
}
