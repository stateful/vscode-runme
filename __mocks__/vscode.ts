import path from 'node:path'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { vi } from 'vitest'
import { URI } from 'vscode-uri'
import { Command, Disposable as DisposableOriginal } from 'vscode'

export const Disposable = {
  from: vi.fn()
}

export const notebooks = {
  createNotebookController: vi.fn().mockReturnValue({
    dispose: vi.fn(),
    createNotebookCellExecution: vi.fn().mockReturnValue({ start: vi.fn(), end: vi.fn() })
  }),
  registerNotebookCellStatusBarItemProvider: vi.fn(),
  createRendererMessaging: vi.fn().mockReturnValue({
    postMessage: vi.fn(),
    onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() })
  }),
}

export class Uri extends URI {
  static file = vi.fn(super.file)
  static parse = vi.fn(super.parse)

  static joinPath = vi.fn((uri: Uri, ...paths: string[]) => {
    /**
     * Allow testing against http endpoints
     */
    if (uri.authority?.includes('.stateful.com')) {
      return  `https://testing.stateful.com${path.join(...paths)}`
    }
    return super.file(path.join(uri.fsPath, ...paths))
  })
}

export const workspace = {
  asRelativePath: vi.fn(),
  getConfiguration: vi.fn().mockReturnValue(new Map()),
  onDidChangeConfiguration: vi.fn(),
  openNotebookDocument: vi.fn().mockReturnValue({ uri: 'new notebook uri' }),
  openTextDocument: vi.fn().mockReturnValue({
    getText: vi.fn().mockReturnValue(readFileSync(join(__dirname, 'gitignore.mock'), 'utf8'))
  }),
  registerNotebookSerializer: vi.fn(),
  onDidCloseNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidOpenNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  notebookDocuments: { find: vi.fn() },
  fs: {
    writeFile: vi.fn(),
    readFile: vi.fn().mockResolvedValue(Buffer.from('some wasm file')),
    stat: vi.fn().mockResolvedValue(1),
    createDirectory: vi.fn(),
    delete: vi.fn()
  },
  createFileSystemWatcher: vi.fn().mockReturnValue({
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn()
  }),
  workspaceFolders: [ { uri: { fsPath: '/runme/workspace' } } ],
  findFiles: vi.fn().mockReturnValue([
    {
      path: 'runme/workspace/README.md',
    },
    {
      path: 'runme/workspace/src/README.md',
    },
    {
      path: 'runme/workspace/src/COMMANDS.md',
    },
    {
      path: 'runme/workspace/src/RUNME.md',
    }
  ]),
  applyEdit: vi.fn(),
  registerFileSystemProvider: vi.fn(),
}

export const terminal = {
  show: vi.fn(),
  sendText: vi.fn(),
  dispose: vi.fn()
}

export const window = {
  createOutputChannel: vi.fn().mockReturnValue({
    appendLine: vi.fn()
  }),
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  createTerminal: vi.fn().mockReturnValue(terminal),
  createTextEditorDecorationType: vi.fn(),
  showNotebookDocument: vi.fn(),
  showTextDocument: vi.fn(),
  onDidChangeActiveNotebookEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidChangeNotebookEditorSelection: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  registerTreeDataProvider: vi.fn(),
  registerUriHandler: vi.fn(),
  registerWebviewViewProvider: vi.fn(),
  registerTerminalProfileProvider: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidCloseTerminal: vi.fn(),
  withProgress: vi.fn(),
  onDidChangeActiveColorTheme: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  showInputBox: vi.fn(),
  activeColorTheme: {
    kind: 1,
  },
}

export const tasks = {
  registerTaskProvider: vi.fn(),
  onDidEndTaskProcess: vi.fn(),
  onDidStartTaskProcess: vi.fn(),
  executeTask: vi.fn().mockResolvedValue(undefined)
}

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
  getCommands: vi.fn().mockResolvedValue(['_notebook.selectKernel'])
}

export enum ViewColumn {
  Beside = 'Beside'
}

export const env = {
  machineId: 'test_machine_id',
  clipboard: {
    writeText: vi.fn()
  },
  openExternal: vi.fn(),
  onDidChangeTelemetryEnabled: vi.fn(),
  isTelemetryEnabled: false,
}

export const NotebookData = vi.fn()
export const NotebookCellData = vi.fn()
export enum NotebookCellKind {
  Markup = 1,
  Code = 2
}

export const TreeItem = vi.fn()
export const Event = vi.fn()

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export enum FileType {
  /**
   * The file type is unknown.
   */
  Unknown = 0,
  /**
   * A regular file.
   */
  File = 1,
  /**
   * A directory.
   */
  Directory = 2,
  /**
   * A symbolic link to a file.
   */
  SymbolicLink = 64
}

export enum NotebookCellStatusBarAlignment {
  Left = 1,
  Right = 2
}

export class NotebookCellStatusBarItem {
  label: string

  alignment: NotebookCellStatusBarAlignment

  tooltip?: string

  priority?: number

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(label: string, alignment: NotebookCellStatusBarAlignment) {
    this.label = label
    this.alignment = alignment
  }
}



export class NotebookCellOutputItem {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static json(value: any, mime = 'text/plain'): NotebookCellOutputItem {
    return {
      mime: mime,
      data: new Uint8Array()
    }
  }

  mime: string
  data: Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(data: Uint8Array, mime: string) {}
}

export class NotebookCellOutput {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(public items: NotebookCellOutputItem[], public metadata?: { [key: string]: any }) {}
}

export const ProgressLocation = {
  Window: 1
}

type MessageCallback<T> = (message: T) => void
type Event<T> = (listener: MessageCallback<T>) => DisposableOriginal

export class EventEmitter<T> {
  listeners: MessageCallback<T>[] = []

  event: Event<T> = (listener) => {
    this.listeners.push(listener)

    return {
      dispose: () => {
        this.listeners = this.listeners.filter(x => x !== listener)
      }
    }
  }

  fire(data: T) {
    this.listeners.forEach(l => l(data))
  }

  async fireAsync(data: T) {
    await Promise.all(
      this.listeners.map(l => l(data))
    )
  }

  dispose() { }
}

export const languages = {
  registerCodeLensProvider: vi.fn(),
  getLanguages: vi.fn().mockResolvedValue([]),
}

export class Position {
  constructor(
    public line: number,
    public character: number
  ) { }

  with(line?: number, character?: number): Position {
    return new Position(
      line ?? this.line,
      character ?? this.character,
    )
  }
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) { }
}

export class CodeLens {
  constructor(
    public range: Range,
    public command?: Command
  ) { }
}

export enum TaskScope {
  /**
   * The task is a global task. Global tasks are currently not supported.
   */
  Global = 1,

  /**
   * The task is a workspace task
   */
  Workspace = 2
}

export const ShellExecution = vi.fn()
export const Task = vi.fn()
export const authentication = {
  getSession: vi.fn(),
  onDidChangeSessions: vi.fn(),
  registerAuthenticationProvider: vi.fn()
}

export class WorkspaceEdit {
  set() {}
}

export class NotebookEdit {
  static updateCellMetadata = vi.fn()
}

/**
 * Represents an end of line character sequence in a {@link TextDocument document}.
 */
export enum EndOfLine {
  /**
   * The line feed `\n` character.
   */
  LF = 1,
  /**
   * The carriage return line feed `\r\n` sequence.
   */
  CRLF = 2
}

export class CancellationTokenSource {
  cancel = vi.fn()
  dispose = vi.fn()
}

export const version = '9.9.9'
