import glob from 'glob'
import { join, basename, dirname, resolve } from 'path'
import * as vscode from 'vscode'

interface IRunmeFileProps {
  tooltip: string
  lightIcon: string
  darkIcon: string
  collapsibleState: vscode.TreeItemCollapsibleState
  onSelectedCommand?: vscode.Command
  contextValue: string
}

export class RunmeFile extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    { collapsibleState, tooltip, onSelectedCommand, lightIcon, darkIcon, contextValue }: IRunmeFileProps
  ) {
    super(label, collapsibleState)
    const assetsPath = join(__filename, '..', '..', 'assets')
    this.tooltip = tooltip
    this.label = label
    this.command = onSelectedCommand
    this.contextValue = contextValue
    this.iconPath = {
      light: join(assetsPath, lightIcon),
      dark: join(assetsPath, darkIcon),
    }
  }
}

export class RunmeLauncherProvider implements vscode.TreeDataProvider<RunmeFile> {
  private filesTree: Map<string, any>
  private workspaceRoot: string
  constructor() {
    const rootPath =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined
    this.workspaceRoot = rootPath || ''
    this.filesTree = new Map()
  }

  private _onDidChangeTreeData: vscode.EventEmitter<RunmeFile | undefined | void> = new vscode.EventEmitter<
    RunmeFile | undefined | void
  >()

  readonly onDidChangeTreeData: vscode.Event<RunmeFile | undefined | void> = this._onDidChangeTreeData.event
  getTreeItem(element: RunmeFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element
  }
  getChildren(element?: RunmeFile | undefined): Thenable<RunmeFile[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([])
    }

    if (!element) {
      return new Promise((resolve: (value: RunmeFile[]) => void) => {
        this.getRunmeFilesFromWorkspace(resolve)
      })
    }

    const { files, folderPath } = this.filesTree.get(element.label)
    const folderMarkdownItems: RunmeFile[] = []
    for (const file of files) {
      folderMarkdownItems.push(
        new RunmeFile(file, {
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          tooltip: 'Click to open markdown file',
          lightIcon: 'icon.gif',
          darkIcon: 'icon.gif',
          contextValue: 'markdown-file',
          onSelectedCommand: {
            arguments: [{ file, folderPath }],
            command: 'runme.openRunmeFile',
            title: file,
          },
        })
      )
    }

    return Promise.resolve(folderMarkdownItems)
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getRunmeFilesFromWorkspace(onComplete: (value: RunmeFile[]) => void): any {
    glob('**/*.md', { cwd: this.workspaceRoot, ignore: 'node_modules/**', absolute: true }, (err, files) => {
      const RunmeFileCollection: RunmeFile[] = []

      for (const file of files) {
        const info = basename(file)
        const folderPath = dirname(file)
        const folderName = dirname(file).replace(resolve(__dirname, '..'), '') || this.workspaceRoot
        if (!this.filesTree.has(folderName)) {
          this.filesTree.set(folderName, { files: [info], folderPath })
        } else {
          const { files } = this.filesTree.get(folderName)
          this.filesTree.set(folderName, { files: [...files, info], folderPath })
        }
      }

      for (const folder of this.filesTree.keys()) {
        RunmeFileCollection.push(
          new RunmeFile(folder || basename(this.workspaceRoot), {
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            tooltip: 'Click to see markdown files',
            lightIcon: 'folder.svg',
            darkIcon: 'folder.svg',
            contextValue: 'folder',
          })
        )
      }
      onComplete(RunmeFileCollection.reverse())
    })
  }

  public static async openFile({ file, folderPath }: { file: string; folderPath: string }) {
    const doc = vscode.Uri.file(`${folderPath}/${file}`)
    await vscode.commands.executeCommand('vscode.openWith', doc, 'runme')
  }
}
