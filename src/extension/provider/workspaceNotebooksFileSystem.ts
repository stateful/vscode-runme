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
  workspace,
} from 'vscode'

import getOneWorkflow from '../messages/platformRequest/getOneWorkflow'

export default class WorkspaceNotebooksFileSystem implements FileSystemProvider {
  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event

  constructor() {
    workspace.registerFileSystemProvider('runmefs', this, { isReadonly: false })
  }

  async readFile(uri: Uri): Promise<Uint8Array> {
    // runmefs://fffc4265-5ee8-4bde-81d7-3278fa8766a0/Untitled-1.md
    const id = uri.path.split('/')[1]

    if (!id) {
      throw FileSystemError.FileNotFound(uri)
    }
    try {
      const workflow = await getOneWorkflow(id)
      return workflow.data.workflow.data as Uint8Array
    } catch (error) {
      throw FileSystemError.FileNotFound(uri)
    }
  }

  writeFile(
    _uri: Uri,
    _content: Uint8Array,
    _options: { create: boolean; overwrite: boolean },
  ): void {}

  watch(_uri: Uri, _options: { recursive: boolean; excludes: string[] }): Disposable {
    return new Disposable(() => {})
  }

  async stat(uri: Uri): Promise<FileStat> {
    return {
      type: FileType.File,
      size: (await this.readFile(uri)).byteLength,
      ctime: Date.now(),
      mtime: Date.now(),
    }
  }

  async readDirectory(_uri: Uri): Promise<[string, FileType][]> {
    return []
  }

  createDirectory(_uri: Uri): void {}

  delete(_uri: Uri): void {}

  rename(_oldUri: Uri, _newUri: Uri, _options: { overwrite: boolean }): void {}
}
