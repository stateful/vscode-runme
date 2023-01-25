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
  FileType,
} from 'vscode'

import { Kernel } from '../kernel'
import { mapGitIgnoreToGlobFolders, getPathType } from '../utils'

interface IRunmeFileProps {
  tooltip: string
  lightIcon: string
  darkIcon: string
  collapsibleState: TreeItemCollapsibleState
  onSelectedCommand?: Command
  contextValue: string
}

interface TreeFile {
  files: string[]
  folderPath: string
}

export class RunmeFile extends TreeItem {
  constructor(
    public readonly label: string,
    { collapsibleState, tooltip, onSelectedCommand, lightIcon, darkIcon, contextValue }: IRunmeFileProps
  ) {
    console.log('-->', label, collapsibleState, TreeItemCollapsibleState.Expanded)

    super(label, collapsibleState)
    const assetsPath = join(__filename, '..', '..', 'assets')

    this.collapsibleState = collapsibleState
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
  private filesTree: Map<string, TreeFile> = new Map()
  private defaultItemState: TreeItemCollapsibleState = TreeItemCollapsibleState.Collapsed

  constructor(private workspaceRoot?: string | undefined) {}

  private _onDidChangeTreeData: EventEmitter<RunmeFile | undefined | void> = new EventEmitter<
    RunmeFile | undefined | void
  >()

  readonly onDidChangeTreeData: Event<RunmeFile | undefined | void> = this._onDidChangeTreeData.event
  getTreeItem(element: RunmeFile): TreeItem | Thenable<TreeItem> {
    return element
  }

  getChildren(element?: RunmeFile | undefined): Thenable<RunmeFile[]> | RunmeFile[] {
    if (!this.workspaceRoot) {
      return Promise.resolve([])
    }

    if (!element) {
      return this.getRunmeFilesFromWorkspace()
    }

    const { files, folderPath } = this.filesTree.get(element.label) || { files: [] }
    return files.map((file) => new RunmeFile(file, {
      collapsibleState: TreeItemCollapsibleState.None,
      tooltip: 'Click to open runme file',
      lightIcon: 'icon.gif',
      darkIcon: 'icon.gif',
      contextValue: 'markdown-file',
      onSelectedCommand: {
        arguments: [{ file, folderPath }],
        command: 'runme.openRunmeFile',
        title: file,
      }
    }))
  }

  refresh(): void {
    this.filesTree = new Map()
    this._scanWorkspace().finally(
      () => this._onDidChangeTreeData.fire())
  }

  async getRunmeFilesFromWorkspace(): Promise<RunmeFile[]> {

    if (this.filesTree.size === 0) {
      await this._scanWorkspace()
    }

    console.log(
      'MAP',
      this.filesTree.keys(),
      ' to ',
      this.defaultItemState === TreeItemCollapsibleState.Collapsed ? 'Collapsed' : 'Expanded'
    )
    return [...this.filesTree.keys()].map((folder) => new RunmeFile(folder, {
      collapsibleState: this.defaultItemState,
      tooltip: 'Click to open runme files from folder',
      lightIcon: 'folder.svg',
      darkIcon: 'folder.svg',
      contextValue: 'folder',
    })).sort((a: RunmeFile,b: RunmeFile) => a.label.length > b.label.length ? 1 : -1)
  }

  public static async openFile({ file, folderPath }: { file: string, folderPath: string }) {
    const doc = Uri.file(`${folderPath}/${file}`)
    await commands.executeCommand('vscode.openWith', doc, Kernel.type)
  }

  collapseAll () {
    this.defaultItemState = TreeItemCollapsibleState.Collapsed
    this.refresh()
    commands.executeCommand('setContext', 'runme.launcher.isExpanded', false)
  }

  expandAll () {
    this.defaultItemState = TreeItemCollapsibleState.Expanded
    this.refresh()
    commands.executeCommand('setContext', 'runme.launcher.isExpanded', true)
  }

  private async _scanWorkspace () {
    let excludePatterns

    if (this.workspaceRoot) {
      const gitIgnoreUri = Uri.parse(join(this.workspaceRoot, '.gitignore'))
      const hasGitDirectory = (await getPathType(gitIgnoreUri)) === FileType.File

      if (hasGitDirectory) {
        const ignoreList = await workspace.openTextDocument(gitIgnoreUri)
        const patterns = mapGitIgnoreToGlobFolders(ignoreList.getText().split('\n'))
        excludePatterns = patterns.join(',')
      }
    }
    const files = await workspace.findFiles('**/*.md', `{${excludePatterns}}`)
    const rootFolder = basename(this.workspaceRoot || '')

    for (const { path } of files) {
      const info = basename(path)
      const folderPath = dirname(path)
      const folderName = dirname(path).replace(resolve(this.workspaceRoot || '', '..'), '') || rootFolder
      if (!this.filesTree.has(folderName)) {
        this.filesTree.set(folderName, { files: [info], folderPath })
      } else {
        const { files } = this.filesTree.get(folderName) || { files: [] }
        this.filesTree.set(folderName, { files: [...files, info], folderPath })
      }
    }
  }
}
