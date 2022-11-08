const path = require('node:path')

const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:8080')
const file = 'README.md'
const dir = path.resolve(__dirname, 'examples')

async function command (command, file, dir) {
  console.log(`Send command: "${command}" for ${file} in ${dir}`)
  ws.send(JSON.stringify({ command, file, dir }))
  return new Promise((resolve) => {
    function listener (msg) {
      const message = JSON.parse(msg.toString())
      const value = message.value.toString().trim()

      console.log(`[${message.type}] ${value}`)
      if (message.type === 'exitCode') {
        ws.off('message', listener)
        resolve()
      }
    }
    ws.on('message', listener)
  })
}

ws.on('open', async () => {
  /**
   * make sequential stateful commands
   */
  await command('echo-auth', file, dir)
  await command('echo-servicefootoken', file, dir)

  ws.close()
})
