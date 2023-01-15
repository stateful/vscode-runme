import { vi } from 'vitest'

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

export const Uri = {
  joinPath: vi.fn().mockReturnValue('/foo/bar'),
  parse: vi.fn()
}

export const workspace = {
  getConfiguration: vi.fn().mockReturnValue(new Map()),
  openNotebookDocument: vi.fn().mockReturnValue({ uri: 'new notebook uri' }),
  openTextDocument: vi.fn(),
  registerNotebookSerializer: vi.fn(),
  fs: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('some wasm file')),
  },
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
  sendText: vi.fn()
}

export const window = {
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  createTerminal: vi.fn().mockReturnValue(terminal),
  showNotebookDocument: vi.fn(),
  showTextDocument: vi.fn(),
  onDidChangeActiveNotebookEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  registerTreeDataProvider: vi.fn(),
  onDidCloseTerminal: vi.fn()
}

export const tasks = {
  registerTaskProvider: vi.fn()
}

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn()
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
export const EventEmitter = vi.fn()
export const Event = vi.fn()

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}