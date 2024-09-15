import {
  Disposable,
  Event,
  EventEmitter,
  FileChangeEvent,
  FileChangeType,
  FileStat,
  FileSystemError,
  FileSystemProvider,
  FileType,
  Uri,
} from 'vscode'

// https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider
class MemFS implements FileSystemProvider {
  private files = new Map<string, Uint8Array>()

  readFile(uri: Uri): Uint8Array {
    const file = this.files.get(uri.path)
    if (!file) {
      throw FileSystemError.FileNotFound()
    }
    return file
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    _options: { create: boolean; overwrite: boolean },
  ): void {
    this.files.set(uri.path, content)
    this._fireSoon({ type: FileChangeType.Changed, uri })
  }

  watch(_uri: Uri, _options: { recursive: boolean; excludes: string[] }): Disposable {
    return new Disposable(() => {})
  }

  stat(uri: Uri): FileStat {
    return {
      type: FileType.File,
      size: this.readFile(uri).byteLength,
      ctime: Date.now(),
      mtime: Date.now(),
    }
  }

  readDirectory(_uri: Uri): [string, FileType][] {
    return []
  }

  createDirectory(_uri: Uri): void {}

  delete(uri: Uri): void {
    this.files.delete(uri.path)
  }

  rename(_oldUri: Uri, _newUri: Uri, _options: { overwrite: boolean }): void {}

  private _onDidChangeFile: EventEmitter<FileChangeEvent[]> = new EventEmitter<FileChangeEvent[]>()
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._onDidChangeFile.event

  private _fireSoon(...events: FileChangeEvent[]): void {
    setTimeout(() => this._onDidChangeFile.fire(events), 5)
  }
}

export default MemFS
