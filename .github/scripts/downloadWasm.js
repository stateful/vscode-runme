import fsp from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import tar from 'tar-fs'
import { promisify } from 'node:util'
import { pipeline } from 'node:stream'
import { Octokit } from '@octokit/rest'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const streamPipeline = promisify(pipeline)

const owner = 'stateful'
const repo = 'runme'
const assetName = 'runme_js_wasm.tar.gz'

function verifyNodeVersion () {
  const [major] = process.version.slice(1).split('.')
  if (parseInt(major, 10) < 18) {
    throw new Error(`This script requires Node.js v18! Please run "nvm install".`)
  }
}

async function getGitHubToken () {
  let token = process.env.GITHUB_TOKEN
  if (!token) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    token = await new Promise((resolve, reject) => rl.question('🔐 Enter a valid GitHub token...\n> ', (name) => {
      if (!name) {
        return reject(new Error('⚠️  Invalid token!'))
      }
      rl.close()
      return resolve(name)
    }))
  }
  return token
}

async function downloadWasm (token) {
  const octokit = new Octokit({ auth: token })
  const wasmReleaseDefined = Boolean(process.env.RUNME_VERSION)
  const releases = await octokit.repos.listReleases({ owner, repo })
  const release = wasmReleaseDefined
    ? releases.data.find((r) => r.tag_name === process.env.RUNME_VERSION)
    : releases.data.filter(r => r.prerelease === false)[0]

  if (wasmReleaseDefined && !release) {
    throw new Error(
      `No release found with tag name "${process.env.RUNME_VERSION}", ` +
      `available releases: ${releases.data.map((r) => r.tag_name).join(', ')}`
    )
  }
  if (!wasmReleaseDefined) {
    console.info(`No specific runme CLI version defined via "RUNME_VERSION", downloading ${release.tag_name}`)
  }

  const asset = release.assets.find((a) => a.name === assetName)
  if (!asset) {
    throw new Error(`Couldn't find WASM asset with name "${assetName}" in release with tag name ${release.tag_name}`)
  }

  console.log(`Downloading ${asset.browser_download_url}...`)
  const res = await fetch(asset.browser_download_url)
  const targetDir = path.resolve(__dirname, '..', '..', 'wasm')
  const wasmFilePath = path.resolve(targetDir, 'runme.wasm')

  await fsp.mkdir(targetDir, { recursive: true })
  await streamPipeline(res.body, zlib.createGunzip(), tar.extract(targetDir))
  console.log(`✅ Successfully downloaded and unpacked WASM file to ${wasmFilePath}`)
}

/**
 * program:
 */
verifyNodeVersion()
const token = await getGitHubToken()
await downloadWasm(token)
