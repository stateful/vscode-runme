import glob from 'glob';
import { join, basename, dirname, resolve } from 'path';
import * as vscode from 'vscode';

interface IMarkdownFileProps {
  tooltip: string;
  lightIcon: string;
  darkIcon: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  onSelectedCommand?: vscode.Command;
  contextValue: string;
}

export class MarkdownFilterItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    { collapsibleState, tooltip, onSelectedCommand, lightIcon, darkIcon, contextValue }: IMarkdownFileProps
  ) {
    super(label, collapsibleState);
    const assetsPath = join(__filename, '..', '..', 'assets');
    this.tooltip = tooltip;
    this.label = label;
    this.command = onSelectedCommand;
    this.contextValue = contextValue;
    this.iconPath = {
      light: join(assetsPath, lightIcon),
      dark: join(assetsPath, darkIcon),
    };
  }
}

export class MarkdownFilterProvider implements vscode.TreeDataProvider<MarkdownFilterItem> {
  private filesTree: Map<string, any>;
  private workspaceRoot: string;
  constructor() {
    const rootPath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;
    this.workspaceRoot = rootPath || '';
    this.filesTree = new Map();
  }

  private _onDidChangeTreeData: vscode.EventEmitter<MarkdownFilterItem | undefined | void> = new vscode.EventEmitter<
    MarkdownFilterItem | undefined | void
  >();

  readonly onDidChangeTreeData: vscode.Event<MarkdownFilterItem | undefined | void> = this._onDidChangeTreeData.event;
  getTreeItem(element: MarkdownFilterItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(element?: MarkdownFilterItem | undefined): Thenable<MarkdownFilterItem[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    if (!element) {
      return new Promise((resolve: (value: MarkdownFilterItem[]) => void) => {
        this.getMarkdownFilesFromWorkspace(resolve);
      });
    }

    const { files, folderPath } = this.filesTree.get(element.label);
    const folderMarkdownItems: MarkdownFilterItem[] = [];
    for (const file of files) {
      folderMarkdownItems.push(
        new MarkdownFilterItem(file, {
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          tooltip: 'Click to open markdown file',
          lightIcon: 'icon.gif',
          darkIcon: 'icon.gif',
          contextValue: 'markdown-file',
          onSelectedCommand: {
            arguments: [{ file, folderPath }],
            command: 'runme.openMarkdownFile',
            title: file,
          },
        })
      );
    }

    return Promise.resolve(folderMarkdownItems);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getMarkdownFilesFromWorkspace(onComplete: (value: MarkdownFilterItem[]) => void): any {
    // TODO: Add ignored folders to extension settings
    glob('**/*.md', { cwd: this.workspaceRoot, ignore: 'node_modules/**', absolute: true }, (err, files) => {
      const markdownFileCollection: MarkdownFilterItem[] = [];

      for (const file of files) {
        const info = basename(file);
        const folderPath = dirname(file);
        const folderName = dirname(file).replace(resolve(__dirname, '..'), '') || this.workspaceRoot;
        if (!this.filesTree.has(folderName)) {
          this.filesTree.set(folderName, { files: [info], folderPath });
        } else {
          const { files } = this.filesTree.get(folderName);
          this.filesTree.set(folderName, { files: [...files, info], folderPath });
        }
      }

      for (const folder of this.filesTree.keys()) {
        markdownFileCollection.push(
          new MarkdownFilterItem(folder || basename(this.workspaceRoot), {
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            tooltip: 'Click to see markdown files',
            lightIcon: 'folder.svg',
            darkIcon: 'folder.svg',
            contextValue: 'folder',
          })
        );
      }
      onComplete(markdownFileCollection.reverse());
    });
  }

  // TODO: Open file as Runme notebook
  public static async openFile({ file, folderPath }: { file: string; folderPath: string }) {
    const doc = vscode.Uri.parse(`${folderPath}/${file}`);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
