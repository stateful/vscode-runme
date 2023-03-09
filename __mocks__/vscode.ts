import path from 'node:path'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { vi } from 'vitest'
import { URI } from 'vscode-uri'

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
    return Uri.file(path.join(uri.fsPath, ...paths))
  })
}

export const workspace = {
  getConfiguration: vi.fn().mockReturnValue(new Map()),
  openNotebookDocument: vi.fn().mockReturnValue({ uri: 'new notebook uri' }),
  openTextDocument: vi.fn().mockReturnValue({
    getText: vi.fn().mockReturnValue(readFileSync(join(__dirname, 'gitignore.mock'), 'utf8'))
  }),
  registerNotebookSerializer: vi.fn(),
  onDidOpenNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
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
  workspaceFolders: [
    {
      uri: {
        fsPath: '/runme/workspace',
      },
    },
  ],
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
}

export const terminal = {
  show: vi.fn(),
  sendText: vi.fn(),
  dispose: vi.fn()
}

export const window = {
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  createTerminal: vi.fn().mockReturnValue(terminal),
  showNotebookDocument: vi.fn(),
  showTextDocument: vi.fn(),
  onDidChangeActiveNotebookEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  registerTreeDataProvider: vi.fn(),
  registerUriHandler: vi.fn(),
  onDidCloseTerminal: vi.fn(),
  withProgress: vi.fn()
}

export const tasks = {
  registerTaskProvider: vi.fn()
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
  clipboard: {
    writeText: vi.fn()
  },
  openExternal: vi.fn()
}

export const NotebookData = vi.fn()
export const NotebookCellData = vi.fn()
export enum NotebookCellKind {
  Code = 1,
  Markup = 2
}

export const TreeItem = vi.fn()
export class EventEmitter {}
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
  static json(value: any, mime?: string): NotebookCellOutputItem {
    return {
      mime: 'text/plain',
      data: new Uint8Array()
    }
  }

  mime: string
  data: Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(data: Uint8Array, mime: string) {}
}

export class NotebookCellOutput {
  items: NotebookCellOutputItem[]
  metadata?: { [key: string]: any }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(items: NotebookCellOutputItem[], metadata?: { [key: string]: any }) {}
}

export const ProgressLocation = {
  Window: 1
}
