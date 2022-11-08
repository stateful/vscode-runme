import { vi } from 'vitest'

export const notebooks = {
  createNotebookController: vi.fn().mockReturnValue({
    createNotebookCellExecution: vi.fn().mockReturnValue({ start: vi.fn(), end: vi.fn() })
  }),
  registerNotebookCellStatusBarItemProvider: vi.fn(),
  createRendererMessaging: vi.fn().mockReturnValue({
    postMessage: vi.fn(),
    onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() })
  })
}

export const Uri = {
  joinPath: vi.fn().mockReturnValue('/foo/bar'),
  parse: vi.fn()
}

export const workspace = {
  openTextDocument: vi.fn(),
  registerNotebookSerializer: vi.fn(),
  fs: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('some wasm file'))
  }
}

export const terminal = {
  show: vi.fn(),
  sendText: vi.fn(),
  dispose: vi.fn()
}

export const window = {
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  createTerminal: vi.fn().mockReturnValue(terminal)
}

export const commands = {
  registerCommand: vi.fn()
}

export const env = {
  clipboard: {
    writeText: vi.fn()
  },
  openExternal: vi.fn()
}
