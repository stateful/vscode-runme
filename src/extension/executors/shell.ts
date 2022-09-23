import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode';
import { file } from 'tmp-promise';

async function shellExecutor (exec: NotebookCellExecution, doc: TextDocument): Promise<boolean> {
    const scriptFile = await file();
    await writeFile(scriptFile.path, doc.getText(), 'utf-8');

    const child = spawn('sh', [scriptFile.path]);
    child.stdout.on('data', (data) => exec.appendOutput(new NotebookCellOutput([NotebookCellOutputItem.stdout(data.toString())])));
    child.stderr.on('data', (data) => exec.appendOutput(new NotebookCellOutput([NotebookCellOutputItem.stdout(data.toString())])));
    return !Boolean(await new Promise((resolve) => child.on('exit', resolve)));
}

export const sh = shellExecutor;
export const bash = shellExecutor;
