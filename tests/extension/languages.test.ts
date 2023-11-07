import path from 'node:path'

import { test, expect } from 'vitest'

import Languages from '../../src/extension/languages'
import { Serializer } from '../../src/types'

import fixture from './fixtures/document.json'

test('cells', () => {
  // todo(sebastian): tests legacy deserializer
  expect((fixture as Serializer.Notebook).cells).toBeTypeOf('object')
})

test('languages#run', async () => {
  const langs = new Languages(path.resolve(__dirname, '../..'))
  const f = fixture as Serializer.Notebook

  const results = await Promise.all(
    f
      .cells!.filter((s) => s.kind !== 1) // skip pure markdown
      .map((s) => {
        return langs.run(Languages.normalizeSource(s.value)).then((l) => {
          return l?.[0]?.languageId
        })
      }),
  )

  expect(results).toStrictEqual([
    'bat',
    'ini',
    'bat',
    'bat',
    'bat',
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
    'csv',
  ])
})

test('languages#biased', async () => {
  const langs = new Languages(path.resolve(__dirname, '../..'))
  const f = fixture as Serializer.Notebook

  const biased = await Promise.all(
    f
      .cells!.filter((s) => s.kind !== 1) // skip pure markdown
      .map((s) => {
        return langs.run(Languages.normalizeSource(s.value)).then((res) => {
          return [res?.[0].languageId, Languages.biased('darwin', res)]
        })
      }),
  )

  expect(biased).toStrictEqual([
    ['bat', 'sh'],
    ['ini', 'sh'],
    ['bat', 'sh'],
    ['bat', 'sh'],
    ['bat', 'sh'],
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
    ['csv', 'sh'],
  ])
})
