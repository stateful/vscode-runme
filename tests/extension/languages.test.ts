import path from 'node:path'

import { test, expect } from 'vitest'

import Languages from '../../src/extension/languages'
import { ParsedDocument, ParsedReadmeEntry } from '../../src/types'

import fixture from './fixtures/document.json'

test('document', () => {
  expect(fixture.document).toBeTypeOf('object')
})

test('languages#run', async () => {
  const langs = new Languages(path.resolve(__dirname, '../..'))
  const f = fixture as ParsedDocument

  const results = await Promise.all(
    f.document!
      .filter((s: ParsedReadmeEntry) => s.content) // skip pure markdown
      .map((s: ParsedReadmeEntry) => {
        return langs.run(s.content!).then(l => {
          return l?.[0]?.languageId
        })
      })
  )

  expect(results).toStrictEqual(['bat','ini','bat','bat','bat','coffee','ini','bat','sh','bat','sh'])
})
