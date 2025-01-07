import { Disposable, TreeItem, TreeDataProvider, TreeItemCollapsibleState, Uri } from 'vscode'

import getAllWorkflows from '../messages/platformRequest/getAllWorkflows'

import { uriAuthority } from './runmeFs'

interface WorkspaceNotebook extends TreeItem {}

export class WorkspaceNotebooks implements TreeDataProvider<WorkspaceNotebook>, Disposable {
  #disposables: Disposable[] = []

  getTreeItem(element: WorkspaceNotebook): TreeItem {
    return element
  }

  async getChildren(_element?: WorkspaceNotebook): Promise<WorkspaceNotebook[]> {
    const response = await getAllWorkflows()
    const workflows = response?.data?.workflows?.data
    if (!workflows.length) {
      return Promise.resolve([])
    }

    const items = workflows.reduce((acc: { [key: string]: TreeItem[] }, workflow) => {
      const [_owner, repository] = workflow.repository.split('/')
      const uri = Uri.parse(
        `runmefs://${uriAuthority}/${repository}/${workflow.path}?q=${workflow.id}`,
      )

      const item: TreeItem = {
        label: `${workflow.path}`,
        id: `${workflow.id}-${workflow.path}`,
        description: `${workflow.repository}`,
        resourceUri: uri,
        collapsibleState: TreeItemCollapsibleState.None,
        command: {
          command: 'runme.openRemoteRunmeFile',
          title: 'Open',
          arguments: [uri],
        },
      }

      const path = workflow.path
      acc[path] = acc[path] || []
      acc[path].push(item)
      return acc
    }, {})

    const sortedItems = Object.keys(items)
      .sort((a, b) => {
        const aHasSlash = a.includes('/')
        const bHasSlash = b.includes('/')
        if (aHasSlash && !bHasSlash) {
          return -1
        }
        if (!aHasSlash && bHasSlash) {
          return 1
        }
        return a.localeCompare(b)
      })
      .flatMap((path) => items[path])

    return sortedItems
  }

  dispose(): void {
    this.#disposables.forEach((disposable) => disposable.dispose())
    this.#disposables = []
  }
}
