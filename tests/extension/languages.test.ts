import path from 'node:path'

import { test, expect } from 'vitest'

import Languages from '../../src/extension/languages'
import { WasmLib } from '../../src/types'

import fixture from './fixtures/document.json'

test('cells', () => {
  expect((fixture as WasmLib.Cells).cells).toBeTypeOf('object')
})

test('languages#run', async () => {
  const langs = new Languages(path.resolve(__dirname, '../..'))
  const f = fixture as WasmLib.Cells

  const results = await Promise.all(
    f.cells!
      .filter((s: WasmLib.Cell) => s.type !== 'markdown') // skip pure markdown
      .map((s: WasmLib.Cell) => {
        return langs.run(Languages.normalizeSource(s.source)).then(l => {
          return l?.[0]?.languageId
        })
      })
  )

  expect(results).toStrictEqual([
    'bat',
    'ini',
    'bat',
    'bat',
    'bat',
    'groovy',
    'ini',
    'bat',
    'sh',
    'bat',
    'sh',
    'bat',
    'bat',
    'dart',
    'sh',
    'bat',
    'bat',
    'csv',
  ])
})

test('languages#biased', async () => {
  const langs = new Languages(path.resolve(__dirname, '../..'))
  const f = fixture as WasmLib.Cells

  const biased = await Promise.all(
    f.cells!
      .filter((s: WasmLib.Cell) => s.type !== 'markdown') // skip pure markdown
      .map((s: WasmLib.Cell) => {
        return langs.run(Languages.normalizeSource(s.source)).then(res => {
          return [res?.[0].languageId, Languages.biased('darwin', res)]
        })
      })
  )

  expect(biased).toStrictEqual([
    ['bat', 'sh'],
    ['ini', 'ini'],
    ['bat', 'sh'],
    ['bat', 'sh'],
    ['bat', 'sh'],
    ['groovy', 'groovy'],
    ['ini', 'sh'],
    ['bat', 'sh'],
    ['sh', 'sh'],
    ['bat', 'sh'],
    ['sh', 'sh'],
    ['bat', 'sh'],
    ['bat', 'sh'],
    ['dart', 'sh'],
    ['sh', 'sh'],
    ['bat', 'sh'],
    ['bat', 'sh'],
    ['csv', 'sh'],
  ])
})
