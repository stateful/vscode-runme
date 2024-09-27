import {dirname, isAbsolute, join, extname} from 'node:path'
import {cwd} from 'node:process'
import {readFile} from 'node:fs/promises'


let warn = (field, desc) => console.warn('⚠️ \x1b[33m%s\x1b[0m',
  `Warning: The package.json field 'extensionless.${field}' must be ${desc}! Using the default value instead...`)

let getPkgJson = async dirPath => {
  do {
    let path = join(dirPath, 'package.json')

    try {
      return {body: JSON.parse(await readFile(path, 'utf8')), path}
    } catch (e) {
      if (!['ENOTDIR', 'ENOENT', 'EISDIR'].includes(e.code)) {
        throw new Error('Cannot retrieve package.json', {cause: e})
      }
    }
  } while (dirPath !== (dirPath = dirname(dirPath)))
}

export async function getConfig({argv1 = ''} = {}) {
  let defaults = {
    lookFor: ['js']
  }, dirPath = isAbsolute(argv1) ? argv1 : cwd(), {
    lookFor
  } = {...defaults, ...(await getPkgJson(dirPath))?.body.extensionless}

  Array.isArray(lookFor) && lookFor.length && lookFor.every(a => typeof a === 'string' && /^[a-z]\w*$/i.test(a)) || (
    lookFor = defaults.lookFor, warn('lookFor', 'an array of alphanumeric strings')
  )

  return {lookFor}
}


let initPromise
export function globalPreload({port}) {
  port.onmessage = e => initPromise = initialize({argv1: e.data})

  return 'port.postMessage(process.argv[1])'
}

let indexFiles, candidates
export async function initialize(data) {
  let {lookFor} = await getConfig(data)

  indexFiles = [lookFor.map(e => `index.${e}`), ['index.json']]
  candidates = indexFiles.map(i => i.map(f => extname(f)).concat(i.map(f => `/${f}`)))
}

let winAbsPath = /^[/\\]?[a-z]:[/\\]/i, relSpecs = ['.', '..']
let specStarts = ['./', '../', '/', 'file://', 'https://', '.\\', '..\\', '\\']
let knownExts = ['.js', '.cjs', '.mjs', '.json', '.node', '.wasm'], empty = [[], []]

export async function resolve(specifier, context, nextResolve) {
  let error, prefix = winAbsPath.test(specifier) ? 'file://' : ''

  if (!prefix && !relSpecs.includes(specifier) && !specStarts.some(s => specifier.startsWith(s))) {
    try {return await nextResolve(specifier)} catch (e) {error = e}
  }

  let {type} = context.importAttributes ?? context.importAssertions
  let trySpec = error ? specifier : new URL(prefix + specifier, context.parentURL).href
  let postfixes = (await initPromise, trySpec.endsWith('/') ?
  indexFiles : knownExts.includes(extname(trySpec)) ? empty : candidates)

  for (let postfix of postfixes[+(type === 'json')]) {
    try {return await nextResolve(trySpec + postfix)} catch {}
  }

  if (error) {
    throw error
  }

  return await nextResolve(trySpec)
}
