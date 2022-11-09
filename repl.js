const readline = require('node:readline')
const cp = require('node:child_process')
const { Transform } = require('node:stream')

const split = require('split2')
const { WebSocketServer } = require('ws')

/**
 * Spawn continous shell session
 */
const cmd = cp.spawn('/bin/sh')

/**
 * Start WebSocket server for clients to connect to this "deamon"
 */
const port = process.argv.slice(2)[0]
const wss = new WebSocketServer({ port })
const connectedClients = new Set()
wss.on('connection', (ws) => {
  connectedClients.add(ws)
  ws.on('message', (msg) => {
    const message = JSON.parse(msg.toString())
    if (typeof message.command === 'string') {
      return runCommand(message.command, message.dir, message.file)
    }
  })
})

const EXIT_CODE_MARKER = 'EXIT CODE: '
const EXIT_CODE_REGEX = /EXIT CODE: (\d+)/g

function emitStdout (stdout) {
  for (const client of connectedClients) {
    client.send(JSON.stringify({ type: 'stdout', value: stdout }))
  }
}

function emitExitCode (code) {
  for (const client of connectedClients) {
    client.send(JSON.stringify({ type: 'exitCode', value: code }))
  }
}

/**
 * Transform class to filter out status code command
 * respond to be propagated as stdout
 */
class Filter extends Transform {
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: true
    })
  }

  _transform(chunk, encoding, next) {
    let stdout = chunk.toString()
    const matches = stdout.match(EXIT_CODE_REGEX)

    /**
     * if exit code command wasn't found propagate to stdout
     */
    if (!matches) {
      emitStdout(stdout)
      return next(null, chunk)
    }

    /**
     * otherwise filter it
     */
    for (const m of matches) {
      stdout = stdout.replace(m, '')
    }
    emitStdout(stdout)
    next(null, Buffer.from(stdout))
  }
}

const transformer = new Filter()
cmd.stdout
  // split chunks on new lines
  .pipe(split(/\r?\n/, line => `${line}\n`))
  // remove custom descriptors and emit stdout event
  .pipe(transformer)
  // pipe into runme stdout
  .pipe(process.stdout)
cmd.stderr
  // split chunks on new lines
  // .pipe(split(/\r?\n/, line => `${line}\n`))
  // // remove custom descriptors and emit stdout event
  // .pipe(transformer)
  // pipe into runme stderr
  .pipe(process.stderr)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * Helper function to run a runme command within a certain directory for
 * a certain markdown file. The return promise is resolved once the command
 * finishes with an exit code.
 */
async function runCommand (command, dir = __dirname, file = 'README.md') {
  const code = cp.execSync(`runme print ${command} --chdir ${dir} --filename ${file}\n`).toString()
  const shellCommand = code.startsWith('$ ') ? code.slice(2) : code
  cmd.stdin.write(`${shellCommand}\n`)

  // capture exit code of last command
  cmd.stdin.write(`echo "${EXIT_CODE_MARKER}$?"\n`)
  const exitCode = await new Promise((resolve) => cmd.stdout.on('data', (buf) => {
    const stdout = buf.toString()
    const match = stdout.match(EXIT_CODE_REGEX)
    if (match) {
      return resolve(parseInt(match[0].slice(EXIT_CODE_MARKER.length - 1), 10))
    }
  }))

  // console.log(`Finished "${command}" with exit code ${exitCode}`)
  emitExitCode(exitCode)
  return exitCode
}

/**
 * This part is optional and offers users to enter commands
 * via stdin in their terminal
 */
;(async () => {
  while(true) {
    const answer = await new Promise((resolve) => rl.question('> ', resolve))
    if (answer === 'exit') {
      rl.close()
    }

    if (answer && answer.startsWith('run ')) {
      const command = (answer.split(' ').pop() || '').trim()
      await runCommand(command)
      continue
    }

    cmd.stdin.write(`runme ${answer}\n`)
  }
})()
