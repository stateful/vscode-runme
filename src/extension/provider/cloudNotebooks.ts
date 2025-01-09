import {
  Disposable,
  TreeItem,
  TreeDataProvider,
  TreeItemCollapsibleState,
  Uri,
  FileType,
} from 'vscode'

import RunmeFS from './runmeFs'

interface WorkspaceNotebook extends TreeItem {
  label: string
  parent?: string
}

export class CloudNotebooks implements TreeDataProvider<WorkspaceNotebook>, Disposable {
  #disposables: Disposable[] = []
  #runmeFs = new RunmeFS()

  getTreeItem(element: WorkspaceNotebook): TreeItem {
    return element
  }

  async getChildren(element?: WorkspaceNotebook): Promise<WorkspaceNotebook[]> {
    if (!element) {
      const dirContent = await this.#runmeFs.readDirectory(this.#runmeFs.root)
      return dirContent.map(([path, type]) => {
        const uri = Uri.parse(`${this.#runmeFs.root.path}/${path}`)

        const item: WorkspaceNotebook = {
          label: path,
          collapsibleState: TreeItemCollapsibleState.None,
        }

        if (type === FileType.Directory) {
          item.collapsibleState = TreeItemCollapsibleState.Collapsed
        } else {
          item.resourceUri = uri
          item.command = {
            command: 'runme.openRemoteRunmeFile',
            title: 'Open',
            arguments: [uri],
          }
        }

        return item
      })
    }

    const uri = RunmeFS.resolveUri(`${element.parent || ''}${element.label}`)

    const dirContent = await this.#runmeFs.readDirectory(uri)
    return dirContent.map(([path, type]) => {
      const uri = RunmeFS.resolveUri(`${element.parent || ''}${element.label || ''}/${path}`)

      const item: WorkspaceNotebook = {
        label: path,
        collapsibleState: TreeItemCollapsibleState.None,
        parent: `${element.label}/`,
      }

      if (type === FileType.Directory) {
        item.collapsibleState = TreeItemCollapsibleState.Collapsed
      } else {
        item.resourceUri = uri
        item.command = {
          command: 'runme.openRemoteRunmeFile',
          title: 'Open',
          arguments: [uri],
        }
      }

      return item
    })
  }

  dispose(): void {
    this.#disposables.forEach((disposable) => disposable.dispose())
    this.#disposables = []
  }
}
