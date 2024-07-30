import * as parser_pb from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'

import * as serializerTypes from '../grpc/serializerTypes'

// Convert from a notebook protobuf represented as protobuf-ts (https://github.com/timostamm/protobuf-ts/tree/main)
// to protobuf-es. See https://github.com/stateful/runme/issues/641.
export function notebookTSToES(left: serializerTypes.Notebook): parser_pb.Notebook {
  try {
    // N.B. Notebook.toJson raises an exception
    let binaryValue = serializerTypes.Notebook.toBinary(left)
    return parser_pb.Notebook.fromBinary(binaryValue)
  } catch (e) {
    console.log(`Failed to convert notebook; error :${e}`)
  }
  return new parser_pb.Notebook()
}

export function cellTSToES(left: serializerTypes.Cell): parser_pb.Cell {
  let data = serializerTypes.Cell.toBinary(left)
  return parser_pb.Cell.fromBinary(data)
}

export function cellsESToTS(left: parser_pb.Cell[]): serializerTypes.Cell[] {
  let cells = []
  for (let cell of left) {
    let binaryValue = cell.toBinary()
    cells.push(serializerTypes.Cell.fromBinary(binaryValue))
  }
  return cells
}
