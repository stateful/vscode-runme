import { pipeline, Readable } from 'node:stream'
import fsp from 'node:fs/promises'
import zlib from 'node:zlib'
import path from 'node:path'
import fs from 'node:fs'
import { parseArgs, promisify } from 'node:util'

import tar from 'tar-fs'
import unzipper from 'unzipper'

import { getLastStableRelease } from './getLastStableRelease.js'

const streamPipeline = promisify(pipeline)
const VALID_FORMATS = ['zip', 'tar']
const SCHEMA = {
  downloadUrl: {
    type: 'string',
    short: 'd',
    default: process.env.DOWNLOAD_URL,
    description: 'Binary file Download URL',
  },
  type: {
    type: 'string',
    short: 'f',
    default: process.env.TYPE,
    description: 'The compressed file format (zip, tar)'
  },
  binaryDestination: {
    type: 'string',
    short: 'b',
    default: 'bin',
    description: 'The destination binary folder (defaults to bin)'
  },
  binaryName: {
    type: 'string',
    short: 'n',
    default: 'runme',
    description: 'The distributed binary name (defaults to runme)'
  }
}

const displayToolHelp = () => {
  console.log('Tool usage')
  for (const [, { short, description }] of Object.entries(SCHEMA)) {
    console.log(`-${short}:${description}`)
  }
}

const cleanCliDownload = async (cliDownloadFolder) => {
  if (
    !await fsp.stat(cliDownloadFolder)
      .then((val) => val.isDirectory())
      .catch(() => false)
  ) {
    console.info("No CLI Download folder found, nothing to do!")
    return
  }

  console.info("🗑️ Cleaning CLI Download folder...")
  await fsp.rm(cliDownloadFolder, { recursive: true, force: true })
  console.info("✅ CLI Download folder cleared!")
}

const downloadBinary = async (downloadUrl, type, binaryDestination, binaryName) => {
  if (!type) {
    type = path.extname(downloadUrl) === '.zip'
      ? 'zip'
      : path.extname(downloadUrl) === '.gz'
        ? 'tar'
        : 'unknown'
  }

  if (!VALID_FORMATS.includes(type)) {
    throw new Error(`Invalid type ${type}, it must be zip or tar file`)
  }

  if (!downloadUrl) {
    throw new Error('Missing a download URL')
  }

  if (!binaryName) {
    throw new Error('Missing binary name')
  }

  const cliFilePath = path.resolve(binaryDestination)
  await cleanCliDownload(cliFilePath)
  await fsp.mkdir(cliFilePath, { recursive: true })
  console.log(`Checking binary destination path: ${cliFilePath}`)
  console.log(`Downloading binary ${downloadUrl}`)
  const res = await fetch(downloadUrl)
  if (type === 'tar') {
    console.log('Extracting tar file')
    await streamPipeline(res.body, zlib.createGunzip(), tar.extract(cliFilePath, {
      ignore: (name) => path.basename(name) !== binaryName
    }))
  } else {
    console.log('Extracting zip file')
    const stream = Readable.from(res.body).pipe(unzipper.Parse())

    stream.on('entry', (entry) => {
      const fileName = entry.path
      const type = entry.type
      if (type === 'File' && path.extname(fileName) === '.exe') {
        const execStream = entry.pipe(fs.createWriteStream(path.join(cliFilePath, binaryName)))
        // workaround for github actions, which will throw an error if you
        // try to write directly to an `exe` file
        execStream.on('close', async () => {
          await fsp.rename(
            path.join(cliFilePath, binaryName),
            path.join(cliFilePath, `${binaryName}.exe`)
          )
        })
      }
    })

    // wait for stream to close
    await new Promise((res, rej) => {
      stream.on('close', res)
      stream.on('error', (err) => rej(err))
    })
  }
  console.log(`✅ Successfully downloaded and unpacked CLI executable file to ${cliFilePath}`)
}

let { values: { downloadUrl, type, binaryDestination, binaryName } } = parseArgs({
  options: SCHEMA
})

try {
  if (!downloadUrl) {
    downloadUrl = await getLastStableRelease()
  }
  await downloadBinary(downloadUrl, type, binaryDestination, binaryName)
} catch (error) {
  displayToolHelp()
  throw error
}
