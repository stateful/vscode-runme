import { describe, it } from 'vitest'

import { GenerateCellsRequest } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb'

import { initAIServiceClient } from '../../../src/extension/ai/client'
import { CellKind } from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb'

describe('AIService Client Test', () => {
  it('can call the grpc service', async () => {
    const client = initAIServiceClient()
    const req = GenerateCellsRequest.create()
    req.notebook = {
      cells: [
        {
          value: 'Use gcloud to list the google cloud build jobs',
          kind: CellKind.MARKUP,
          metadata: {},
          outputs: [],
          languageId: '',
        },
      ],
      metadata: {},
    }

    await client
      .generateCells(req)
      .then((res) => {
        console.log(res)
      })
      .catch((err) => {
        console.error(err)
      })
  })
})
