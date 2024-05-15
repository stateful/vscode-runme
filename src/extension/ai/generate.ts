import * as vscode from 'vscode'
// import {FoyleClient, getTraceID} from './client';
// import * as converters from './converters';
// import * as docpb from "../gen/foyle/v1alpha1/doc_pb";
// import * as agentpb from "../gen/foyle/v1alpha1/agent_pb";
// generateCompletion generates a completion by calling the foyle backend and then adds
// the returned blocks to the window
export async function generateCompletion() {
  vscode.window.showInformationMessage('Hello World From the Foyle AI Extension!')
  // const editor = vscode.window.activeNotebookEditor;

  // if (!editor) {
  //   return;
  // }

  // if (editor?.selection.isEmpty) {
  //   return;
  // }

  // // We subtract 1 because end is non-inclusive
  // const lastSelectedCell = editor?.selection.end - 1;
  // var lastActiveCell = editor?.notebook.cellAt(lastSelectedCell);
  // let cells = editor?.notebook.getCells(new vscode.NotebookRange(0, editor?.notebook.cellCount));

  // let doc = new docpb.Doc();
  // doc.blocks = [];
  // for (let cell of cells) {
  //   let block = converters.cellDataToBlock(converters.cellToCellData(cell));
  //   doc.blocks.push(block);
  // }

  // let client = new FoyleClient();

  // const request = new agentpb.GenerateRequest();
  // request.doc = doc;

  // client.generate(request).then((response: agentpb.GenerateResponse) => {
  //   var traceId = "";

  //   traceId = getTraceID(response.blocks);

  //   console.log(`Generate request succeeded traceId: ${traceId}`);

  //   // To add the traceId to the input data we need to create a mutation
  //   const traceIdEdit = createAddTraceIDMutation(lastActiveCell, traceId);

  //   const insertCells = addAIGeneratedCells(lastSelectedCell+1, response);

  //   const edit = new vscode.WorkspaceEdit();
  //   const notebookUri = editor?.notebook.uri;
  //   edit.set(notebookUri, [insertCells, traceIdEdit]);
  //   vscode.workspace.applyEdit(edit).then((result:boolean)=>{
  //     console.log(`applyedit resolved with ${result}`);
  //   });
  // }).catch((error) => {
  //   console.error(`Generate request failed ${error}`);
  //   return;
  // });
}

// // addAIGeneratedCells turns the response from the AI model into a set of cells that can be inserted
//  into the notebook.
// // This is done by returning a mutation to add the new cells to the notebook.
// // index is the position in the notebook at which the new the new cells should be inserted.
// function addAIGeneratedCells(index: number,response: agentpb.GenerateResponse): vscode.NotebookEdit {
//   let newCellData: vscode.NotebookCellData[] = [];

//   for (let newBlock of response.blocks) {
//     const data = converters.blockToCellData(newBlock);
//     newCellData.push(data);
//   }

//    // Now insert the new cells at the end of the notebook
//    return  vscode.NotebookEdit.insertCells(index, newCellData);
// }
