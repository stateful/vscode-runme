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

    return workflows.map((workflow) => {
      return {
        label: `${workflow.path}`,
        description: `${workflow.repository}`,
        resourceUri: Uri.parse(`runmefs://${workflow.id}/${workflow.path}`),
        collapsibleState: TreeItemCollapsibleState.None,
      }
    })
  }

  dispose(): void {
    this.#disposables.forEach((disposable) => disposable.dispose())
    this.#disposables = []
  }
}
