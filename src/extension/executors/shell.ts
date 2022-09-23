import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode';
import { file } from 'tmp-promise';

async function shellExecutor (exec: NotebookCellExecution, doc: TextDocument): Promise<boolean> {
    const outputItems: string[] = [];
    const scriptFile = await file();
    await writeFile(scriptFile.path, doc.getText(), 'utf-8');

    const child = spawn('sh', [scriptFile.path], {
        cwd: path.dirname(doc.uri.path)
    });

    /**
     * handle output for stdout and stderr
     */
    function handleOutput (data: any) {
        outputItems.push(data.toString().trim());
        exec.replaceOutput(new NotebookCellOutput([
            NotebookCellOutputItem.stdout(outputItems.join('\n'))
        ]));
    }

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    return !Boolean(await new Promise((resolve) => child.on('exit', resolve)));
}

export const sh = shellExecutor;
export const bash = shellExecutor;
