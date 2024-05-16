import * as assert from 'node:assert'

// TODO(jeremy): Importing vscode here appears to cause this to fail when run as a unit-test using
// npx runme run test:unit
import * as vscode from 'vscode'
import { describe, it } from 'vitest'
import { GenerateCellsRequest } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb'
import { CellKind } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb'

import * as converters from '../../../src/extension/ai/converters'

// TODO(jeremy): Add more tests assuming we do in fact need the converters.
// Also I'm not quite sure how to run just this test in vscode.
describe('Converters Test', () => {
  it('cellDataToProto-basic', async () => {
    let cell = new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      "print('Hello World')",
      'python',
    )
    let actual = converters.cellDataToProto(cell)
    let expected = {
      value: "print('Hello World')",
      kind: CellKind.CODE,
      languageId: 'python',
      outputs: [],
    }
    assert.deepEqual(actual, expected)
  })
})
