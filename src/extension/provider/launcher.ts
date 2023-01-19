import { join, basename, dirname, resolve } from 'node:path'

import {
  TreeItem,
  EventEmitter,
  workspace,
  TreeItemCollapsibleState,
  Command,
  TreeDataProvider,
  Event,
  Uri,
  commands,
} from 'vscode'

interface IRunmeFileProps {
  tooltip: string
  lightIcon: string
  darkIcon: string
  collapsibleState: TreeItemCollapsibleState
  onSelectedCommand?: Command
  contextValue: string
}

export class RunmeFile extends TreeItem {
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

export class RunmeLauncherProvider implements TreeDataProvider<RunmeFile> {
  private filesTree: Map<string, any>
  constructor(private workspaceRoot?: string | undefined) {
    this.filesTree = new Map()
  }

  private _onDidChangeTreeData: EventEmitter<RunmeFile | undefined | void> = new EventEmitter<
    RunmeFile | undefined | void
  >()

  readonly onDidChangeTreeData: Event<RunmeFile | undefined | void> = this._onDidChangeTreeData.event
  getTreeItem(element: RunmeFile): TreeItem | Thenable<TreeItem> {
    return element
  }
  getChildren(element?: RunmeFile | undefined): Thenable<RunmeFile[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([])
    }

    if (!element) {
      return new Promise(async (resolve: (value: RunmeFile[]) => void) => {
        await this.getRunmeFilesFromWorkspace(resolve)
      })
    }

    const { files, folderPath } = this.filesTree.get(element.label)
    const folderMarkdownItems: RunmeFile[] = []

    for (const file of files) {
      folderMarkdownItems.push(
        new RunmeFile(file, {
          collapsibleState: TreeItemCollapsibleState.None,
          tooltip: 'Click to open runme file',
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

  async getRunmeFilesFromWorkspace(onComplete: (value: RunmeFile[]) => void): Promise<void> {
    const runmeFileCollection: RunmeFile[] = []
    const files = await workspace.findFiles('**/*.md', '**/node_modules/**')

    for (const { path } of files) {
      const info = basename(path)
      const folderPath = dirname(path)
      const folderName = dirname(path).replace(resolve(__dirname, '..'), '')
      if (!this.filesTree.has(folderName)) {
        this.filesTree.set(folderName, { files: [info], folderPath })
      } else {
        const { files } = this.filesTree.get(folderName)
        this.filesTree.set(folderName, { files: [...files, info], folderPath })
      }
    }

    for (const folder of this.filesTree.keys()) {
      runmeFileCollection.push(
        new RunmeFile(folder || basename(this.workspaceRoot || ''), {
          collapsibleState: TreeItemCollapsibleState.Collapsed,
          tooltip: 'Click to open runme files from folder',
          lightIcon: 'folder.svg',
          darkIcon: 'folder.svg',
          contextValue: 'folder',
        })
      )
    }
    onComplete(runmeFileCollection)
  }

  public static async openFile({ file, folderPath }: { file: string, folderPath: string }) {
    const doc = Uri.file(`${folderPath}/${file}`)
    await commands.executeCommand('vscode.openWith', doc, 'runme')
  }
}
