import { Disposable, TreeItem, TreeDataProvider, TreeItemCollapsibleState, Uri } from 'vscode'

import getAllWorkflows from '../messages/platformRequest/getAllWorkflows'

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

    const items = workflows.map((workflow) => {
      const uri = Uri.parse(`runmefs:///${workflow.repository}/${workflow.path}?id=${workflow.id}`)

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

      return item
    })

    return items
  }

  dispose(): void {
    this.#disposables.forEach((disposable) => disposable.dispose())
    this.#disposables = []
  }
}
