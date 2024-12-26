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

export default class WorkspaceNotebooksFileSystem implements FileSystemProvider {
  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event

  async readFile(uri: Uri): Promise<Uint8Array> {
    // extraxt id from query string in uri
    const id = uri.query.split('=')[1]

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
