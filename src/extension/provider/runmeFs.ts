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

type Workflow = {
  owner: string
  repository: string
  path: string
  id: string
}

type PathTree = Record<string, string[]>

const excludedPaths = [
  '.vscode/tasks.json',
  '.vscode/launch.json',
  '.vscode/settings.json',
  '.runme_bootstrap',
  '.runme_bootstrap_demo',
]

/**
 * Handles the virtual file system runmefs://
 */
export const uriAuthority = 'cloud.stateful.com'

export function getRunmeFsUri(uri: Uri) {
  return uri.with({ authority: uriAuthority })
}

export default class RunmeFileSystemProvider implements FileSystemProvider {
  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event

  #notebooks: Workflow[] = []
  #pathTree: PathTree = {}

  async readFile(sourceUri: Uri): Promise<Uint8Array> {
    const uri = getRunmeFsUri(sourceUri)
    let id: string | undefined = uri.query.split('=')[1]
    id = id || (await this.notebooks()).find((n) => `/${n.path}` === uri.path)?.id

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
    const uri = getRunmeFsUri(sourceUri)

    if (excludedPaths.includes(uri.path)) {
      throw FileSystemError.FileNotFound(uri)
    }

    if (this.#pathTree[uri.path] || this.isDir(uri.path)) {
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

  getTreeNodes(notebooks: Workflow[]): PathTree {
    const nodes: PathTree = {}
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

  async notebooks() {
    if (!this.#notebooks.length) {
      const response = await getAllWorkflows()
      const data = response?.data?.workflows?.data || []

      this.#notebooks = data
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

      this.#pathTree = this.getTreeNodes(this.#notebooks)
    }

    return this.#notebooks
  }

  async readDirectory(uri: Uri): Promise<[string, FileType][]> {
    const parent = getRunmeFsUri(uri)
    const children = this.#pathTree[parent.path] || []

    const isRoot = parent.path === '/'
    return children.map((child) => {
      if (isRoot) {
        return [child, FileType.Directory]
      }

      const path = `${parent.path}/${child}`
      return [child, path in this.#pathTree ? FileType.Directory : FileType.File]
    })
  }

  createDirectory(_uri: Uri): void {}

  delete(_uri: Uri): void {}

  rename(_oldUri: Uri, _newUri: Uri, _options: { overwrite: boolean }): void {}
}
