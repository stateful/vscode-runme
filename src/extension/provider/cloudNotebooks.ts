import {
  Disposable,
  TreeItem,
  TreeDataProvider,
  TreeItemCollapsibleState,
  Uri,
  FileType,
} from 'vscode'

import RunmeFS, { mergeUriPaths } from './runmeFs'

interface WorkspaceNotebook extends TreeItem {
  label: string
  uri: Uri
  parentUri: Uri
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
        const uri = mergeUriPaths(this.#runmeFs.root, path)

        const item: WorkspaceNotebook = {
          label: path,
          uri: uri,
          parentUri: uri.with({ path: '/' }),
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

    const dirContent = await this.#runmeFs.readDirectory(element?.uri)

    return dirContent.map(([path, type]) => {
      const parentUri = mergeUriPaths(element?.parentUri, element.label)
      const uri = mergeUriPaths(parentUri, path)

      const item: WorkspaceNotebook = {
        label: path,
        collapsibleState: TreeItemCollapsibleState.None,
        uri: uri,
        parentUri: parentUri,
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
