import { RunProgramOptions } from '../runner'
import { getAnnotations } from '../utils'

import { IKernelRunner, IKernelRunnerOptions, resolveProgramOptionsScript } from './runner'

export const uri: IKernelRunner = async ({
  context,
  runner,
  exec,
  runningCell,
  execKey,
  runnerEnv,
  runScript,
  cellId,
  resource,
}: IKernelRunnerOptions) => {
  const programOptions: RunProgramOptions = await resolveProgramOptionsScript({
    exec,
    execKey,
    runnerEnv,
    runningCell,
    runner,
    cellId,
  })
  const { name: knownName } = getAnnotations(exec.cell)

  // todo(sebastian): move down into kernel?
  if (resource === 'URI') {
    switch (programOptions.exec?.type) {
      case 'script':
        {
          const { script } = programOptions.exec
          programOptions.exec.script = `echo "${script}"`
        }
        break
    }
  }

  if (resource === 'Dagger') {
    const varDaggerCellId = `$DAGGER_${cellId}`

    const printDaggerCellId = `echo ${varDaggerCellId}`
    programOptions.exec = {
      type: 'script',
      script: printDaggerCellId,
    }

    if (knownName) {
      const varDaggerCellName = `DAGGER_ID_${knownName}`
      programOptions.exec.script =
        `export ${varDaggerCellName}` +
        '=$(' +
        printDaggerCellId +
        ' | jq -j .id);' +
        ` ${printDaggerCellId}`
    }
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
