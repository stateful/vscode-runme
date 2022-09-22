import { readFileSync } from "fs-extra";
import * as vscode from "vscode";
import { NotebookCellData, NotebookCellKind, NotebookData } from "vscode";

const fake = [
    "Using stateful/tap",
    "Using hashicorp/terraform",
    "Using caddy",
    "Using postgresql",
    "Using go",
    "Using gh",
    "Using jq",
    "Using stateful/tap/stateful",
    "Using asdf",
    "Using htop",
    "Using nvm",
    "Using gpg",
    "Using mtr",
    "Using zsh-completion",
    "Using hashicorp/tap/terraform",
    "Using bazelisk",
    "Using step",
    "Using protobuf",
    "Using tinygo-org/tools/tinygo",
    "Using google-cloud-sdk",
    "Homebrew Bundle complete! 20 Brewfile dependencies now installed.",
];

// declare const WebAssembly: any;
declare var globalThis: any;

globalThis.crypto = <any>{
    getRandomValues: (array: any) => {
        for (let i = 0, l = array.length; i < l; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    },
};

import "./wasm/wasm_exec.js";

export class Kernel implements vscode.Disposable {
    private controller = vscode.notebooks.createNotebookController(
        "runme",
        "runme",
        "RUNME"
    );

    constructor() {
        this.controller.supportedLanguages = [
            "md",
            "markdown",
            "sh",
            "shell",
            "bash",
            "vercel",
            "Vercel",
        ];
        this.controller.supportsExecutionOrder = true;
        this.controller.description = "Run your README.md";
        this.controller.executeHandler = this._executeAll.bind(this);
    }
    dispose() {}

    private _executeAll(cells: vscode.NotebookCell[]): void {
        for (const cell of cells) {
            this._doExecuteCell(cell);
        }
    }

    private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
        const doc = await vscode.workspace.openTextDocument(cell.document.uri);
        const exec = this.controller.createNotebookCellExecution(cell);
        exec.start(Date.now());

        switch (doc.getText()) {
            case "brew bundle":
                let output = [];

                for (let i = 0; i < fake.length; i++) {
                    output.push(fake[i]);

                    if (i % 4 === 0) {
                        const outCell = new vscode.NotebookCellOutput([
                            vscode.NotebookCellOutputItem.stdout(
                                output.join("\n")
                            ),
                        ]);
                        outCell.metadata = { ran: true };
                        await exec.replaceOutput(outCell);
                        await new Promise((r) =>
                            setTimeout(r, Math.random() * 500)
                        );
                    }
                }
                break;
            default:
                const outCell = new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.json(
                        { site: "stateful-9apxyq02d-stateful.vercel.app" },
                        "x-application/vercel-deploy"
                    ),
                ]);
                outCell.metadata = { ran: true };
                await new Promise((r) =>
                    setTimeout(r, 2000 + Math.random() * 500)
                );
                await exec.replaceOutput(outCell);
        }

        exec.end(false);
    }
}

export class Serializer implements vscode.NotebookSerializer {
    private readonly ready: Promise<void>;
    constructor() {
        const go = new globalThis.Go();
        this.ready = WebAssembly.instantiate(
            readFileSync(`${__dirname}/wasm/runme.wasm`),
            go.importObject
        )
            .then((result: any) => {
                go.run(result.instance);
                return Promise.resolve();
            })
            .catch((err: Error) => {
                console.error(err);
            });
    }

    public deserializeNotebook(
        content: Uint8Array,
        token: vscode.CancellationToken
    ): Thenable<vscode.NotebookData> {
        return this.ready.then(() => {
            const md = content.toString();
            const snippets = globalThis.GetSnippets(md);
            const cells = snippets.reduce(
                (
                    acc: NotebookCellData[],
                    s: {
                        name: string;
                        content: string;
                        description: string;
                        executable: string;
                        lines: string[];
                    }
                ) => {
                    acc.push(
                        new NotebookCellData(
                            NotebookCellKind.Markup,
                            s.description,
                            s.executable
                        )
                    );
                    acc.push(
                        new NotebookCellData(
                            NotebookCellKind.Code,
                            s.lines.join("\n"),
                            s.executable
                        )
                    );
                    return acc;
                },
                []
            );
            return new NotebookData(cells);
        });
    }

    public serializeNotebook(
        data: vscode.NotebookData,
        token: vscode.CancellationToken
    ): Thenable<Uint8Array> {
        return Promise.resolve(new Uint8Array());
    }
}

export class ThumbsUpProvider
    implements vscode.NotebookCellStatusBarItemProvider
{
    provideCellStatusBarItems(
        cell: vscode.NotebookCell
    ): vscode.NotebookCellStatusBarItem | undefined {
        const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"];
        if (typeof ran !== "boolean" || ran === false) {
            return;
        }
        const item = new vscode.NotebookCellStatusBarItem(
            `👍`,
            vscode.NotebookCellStatusBarAlignment.Right
        );
        item.command = "marquee.open";
        item.tooltip = `This worked great`;
        return item;
    }
}

export class ThumbsDownProvider
    implements vscode.NotebookCellStatusBarItemProvider
{
    provideCellStatusBarItems(
        cell: vscode.NotebookCell
    ): vscode.NotebookCellStatusBarItem | undefined {
        const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"];
        if (typeof ran !== "boolean" || ran === false) {
            return;
        }
        const item = new vscode.NotebookCellStatusBarItem(
            `👎`,
            vscode.NotebookCellStatusBarAlignment.Right
        );
        item.command = "marquee.open";
        item.tooltip = `Didn't work`;
        return item;
    }
}
