import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Uri,
} from 'vscode'

import getOneWorkflow from '../messages/platformRequest/getOneWorkflow'
import getAllWorkflows from '../messages/platformRequest/getAllWorkflows'

export type Workflow = {
  owner: string
  repository: string
  path: string
  id: string
}

export type TreeNode = {
  path: string
  fileType?: FileType
  children?: TreeNode[]
}

export type TreeNodes = TreeNode[]
export type NodesMap = Record<string, string[]>

/**
 * Handles the virtual file system runmefs://
 */
export default class WorkspaceNotebooksFileSystem implements FileSystemProvider {
  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event

  #notebooks: Workflow[] = []
  #nodesMap: NodesMap = {}

  async readFile(sourceUri: Uri): Promise<Uint8Array> {
    const uri = sourceUri.with({ authority: 'foo.com' })
    let id: string | undefined = uri.query.split('=')[1]
    id = id || this.#notebooks.find((n) => `/${n.path}` === uri.path)?.id

    if (!id) {
      throw FileSystemError.FileNotFound(uri)
    }
    try {
      const workflow = await getOneWorkflow(id)
      const bytes: number[] = workflow.data.workflow.data || []
      const unit8Array = new Uint8Array(bytes)
      const b64content = new TextDecoder().decode(unit8Array)
      const decoded = atob(b64content)

      return new TextEncoder().encode(decoded)
    } catch (error) {
      throw FileSystemError.FileNotFound(uri)
    }
  }

  writeFile(
    uri: Uri,
    _content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void {
    console.log(`${uri} ${options}`)
  }

  watch(_uri: Uri, _options: { recursive: boolean; excludes: string[] }): Disposable {
    return new Disposable(() => {})
  }

  isFile(pathname: string): boolean {
    const parts = pathname.split('/')
    const lastPart = parts[parts.length - 1]
    const hasExtension = lastPart && /\.[^/.]+$/.test(lastPart)
    return Boolean(hasExtension)
  }

  isDir(pathname: string): boolean {
    return !this.isFile(pathname)
  }

  async stat(sourceUri: Uri): Promise<FileStat> {
    const uri = sourceUri.with({ authority: 'foo.com' })
    const excludedPaths = [
      '.vscode/tasks.json',
      '.vscode/launch.json',
      '.vscode/settings.json',
      '.runme_bootstrap',
      '.runme_bootstrap_demo',
    ]

    if (excludedPaths.includes(uri.path)) {
      throw FileSystemError.FileNotFound(uri)
    }

    if (this.#nodesMap[uri.path] || this.isDir(uri.path)) {
      return {
        type: FileType.Directory,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 0,
      }
    }

    return {
      type: FileType.File,
      size: (await this.readFile(uri)).byteLength,
      ctime: Date.now(),
      mtime: Date.now(),
    }
  }

  async getMarkdownNotebooks() {
    const response = await getAllWorkflows()
    const data = response?.data?.workflows?.data || []
    const notebooks = data
      .map((notebook) => {
        const [owner, repository] = notebook.repository.split('/')

        return {
          id: notebook.id,
          path: `${repository}/${notebook.path}`,
          repository: repository,
          owner: owner,
        }
      })
      .sort((a, b) => a.path.localeCompare(b.path))

    return notebooks
  }

  getTreeNodes(notebooks: Workflow[]): NodesMap {
    const nodes: NodesMap = {}
    nodes['/'] = []

    notebooks.forEach((notebook) => {
      const parts = notebook.path.split('/')
      let currentPath = ''

      // This loop will process all parts of the path, no matter how deep
      for (let i = 0; i < parts.length; i++) {
        const prevPath = currentPath || '/'
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : `/${parts[i]}`

        if (!nodes[prevPath]) {
          nodes[prevPath] = []
        }

        if (!nodes[prevPath].includes(parts[i])) {
          nodes[prevPath].push(parts[i])
        }
      }
    })

    return nodes
  }

  async readDirectory(sourceUri: Uri): Promise<[string, FileType][]> {
    const uri = sourceUri.with({ authority: 'foo.com' })

    if (!this.#notebooks.length) {
      this.#notebooks = await this.getMarkdownNotebooks()
      this.#nodesMap = this.getTreeNodes(this.#notebooks)
    }

    if (!this.#notebooks.length) {
      return []
    }

    const children = this.#nodesMap[uri.path] || []

    const isRoot = uri.path === '/'
    return children.map((child) => {
      if (isRoot) {
        return [child, FileType.Directory]
      }

      const isDir = this.#nodesMap[`${uri.path}/${child}`] ? true : false

      return [child, isDir ? FileType.Directory : FileType.File]
    })
  }

  createDirectory(_uri: Uri): void {}

  delete(_uri: Uri): void {}

  rename(_oldUri: Uri, _newUri: Uri, _options: { overwrite: boolean }): void {}
}
