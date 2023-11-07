import { describe, it, expect, vi, beforeEach } from 'vitest'
// @ts-expect-error mock feature
import { commands, window, Uri, terminal, workspace, tasks } from 'vscode'
import got from 'got'
import { TelemetryReporter } from 'vscode-telemetry'

import { RunmeUriHandler } from '../../../src/extension/handler/uri'
import {
  getProjectDir,
  getSuggestedProjectName,
  writeBootstrapFile,
  parseParams,
  getTargetDirName,
} from '../../../src/extension/handler/utils'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/handler/utils', () => ({
  parseParams: vi.fn().mockReturnValue({}),
  getProjectDir: vi.fn(),
  getTargetDirName: vi.fn(),
  waitForProjectCheckout: vi.fn(),
  getSuggestedProjectName: vi.fn(),
  writeBootstrapFile: vi.fn(),
  setCurrentCellExecutionDemo: vi.fn(),
  shouldExecuteDemo: vi.fn(),
  cleanExecutionDemo: vi.fn(),
}))
vi.mock('got', () => ({
  default: { get: vi.fn().mockResolvedValue({ body: 'some markdown' }) },
}))
vi.mock('../../../src/extension/kernel', () => ({
  Kernel: {},
}))

describe('RunmeUriHandler', () => {
  beforeEach(() => {
    vi.mocked(window.showErrorMessage).mockClear()
    vi.mocked(window.showInformationMessage).mockClear()
    vi.mocked(commands.executeCommand).mockClear()
    vi.mocked(workspace.fs.createDirectory).mockClear()
    vi.mocked(workspace.fs.writeFile).mockClear()
    vi.mocked(Uri.parse).mockReset()
    vi.mocked(getProjectDir).mockClear()
  })

  describe('handleUri', async () => {
    let handler: RunmeUriHandler

    beforeEach(() => {
      handler = new RunmeUriHandler({} as any, {} as any, true)
      handler['_setupProject'] = vi.fn()
      handler['_setupFile'] = vi.fn()
    })

    it('should fail if no command was found', async () => {
      vi.mocked(Uri.parse).mockReturnValue({ query: {} } as any)
      expect(await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))).toBe(undefined)
      expect(window.showErrorMessage).toBeCalledWith('No query parameter "command" provided')
    })

    it('should fail if no command was recognised', async () => {
      vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'foobar' } } as any)
      expect(await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))).toBe(undefined)
      expect(window.showErrorMessage).toBeCalledWith('Couldn\'t recognise command "foobar"')
    })

    it('runs _setupProject if command was "setup"', async () => {
      vi.mocked(Uri.parse).mockReturnValue({
        toString: () => 'some url',
        query: { command: 'setup' },
      } as any)
      vi.mocked(parseParams).mockReturnValue({
        fileToOpen: '/sub/file.md',
        repository: 'git@github.com:/foo/bar',
        cell: -1,
      })
      await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))
      expect(handler['_setupProject']).toBeCalledWith('/sub/file.md', 'git@github.com:/foo/bar')
      expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('extension.uriHandler', {
        command: 'setup',
        type: 'project',
      })
    })

    it('runs _setupFile if command was "setup" but no repository param', async () => {
      vi.mocked(Uri.parse).mockReturnValue({
        toString: () => 'https://some url',
        query: { command: 'setup' },
        fsPath: '/foo/bar',
      } as any)
      vi.mocked(parseParams).mockReturnValue({
        fileToOpen: 'https://some url',
        repository: null,
        cell: -1,
      })
      await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))
      expect(handler['_setupFile']).toBeCalledWith('https://some url')
      expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('extension.uriHandler', {
        command: 'setup',
        type: 'file',
      })
    })
  })

  describe('_setupProject', () => {
    let handler: RunmeUriHandler

    beforeEach(() => {
      handler = new RunmeUriHandler({} as any, {} as any, true)
    })

    it('doesn not do anything if repository was not provided', async () => {
      await handler['_setupProject']('README.md')
      expect(window.showErrorMessage).toBeCalledWith('No project to setup was provided in the url')
      expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
    })

    it('should not run if project dir or suggested name can not be identified', async () => {
      await handler['_setupProject']('README.md', 'foo')
      expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
      vi.mocked(getProjectDir).mockResolvedValueOnce(Uri.file('foobar'))
      await handler['_setupProject']('README.md', 'foo')
      expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
      vi.mocked(getProjectDir).mockResolvedValueOnce(Uri.file('foobar'))
      vi.mocked(getSuggestedProjectName).mockReturnValueOnce('stateful/runme')
      vi.mocked(getTargetDirName).mockResolvedValueOnce('stateful/runme')
      await handler['_setupProject']('README.md', 'foo')
      expect(window.showInformationMessage).toHaveBeenCalledTimes(1)
      expect(window.withProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('_setupFile', () => {
    let handler: RunmeUriHandler

    beforeEach(() => {
      handler = new RunmeUriHandler({} as any, {} as any, true)
    })

    it('shows warning if file is not a markdown', async () => {
      vi.mocked(Uri.parse).mockReturnValue({
        query: { command: 'setup' },
        fsPath: '/foo/bar',
      } as any)
      await handler['_setupFile']('/foo/bar.js')
      expect(window.showErrorMessage).toBeCalledWith(
        'Parameter "fileToOpen" from URL is not a markdown file!',
      )
      expect(getProjectDir).toBeCalledTimes(0)
    })

    it('should fail gracefully', async () => {
      vi.mocked(got.get).mockRejectedValueOnce(new Error('ups'))
      vi.mocked(Uri.parse).mockReturnValue({
        query: { command: 'setup' },
        fsPath: '/foo/bar.md',
      } as any)
      vi.mocked(getProjectDir).mockResolvedValueOnce(Uri.file('foobar'))
      await handler['_setupFile']('/foo/bar.md')
      expect(vi.mocked(window.showErrorMessage).mock.calls[0][0]).toMatch(/Failed to set-up/)
    })

    it('should create new dir with file and open VS Code', async () => {
      vi.mocked(Uri.parse).mockReturnValue({
        query: { command: 'setup' },
        fsPath: '/foo/bar.md',
      } as any)
      vi.mocked(getProjectDir).mockResolvedValueOnce(Uri.file('foobar'))
      await handler['_setupFile']('/foo/bar.md')
      expect(workspace.fs.createDirectory).toBeCalledTimes(1)
      expect(workspace.fs.writeFile).toBeCalledTimes(1)
      expect(writeBootstrapFile).toBeCalledTimes(1)
      expect(commands.executeCommand).toBeCalledWith('vscode.openFolder', expect.any(Object), {
        forceNewWindow: true,
      })
    })
  })

  describe('_cloneProject', () => {
    let handler: RunmeUriHandler
    const progress = { report: vi.fn() }

    beforeEach(() => {
      handler = new RunmeUriHandler({} as any, {} as any, true)
      progress.report.mockClear()
      terminal.dispose.mockClear()
      vi.mocked(tasks.onDidEndTaskProcess).mockReset()
    })

    it('should return false if executeTask fails', async () => {
      vi.mocked(tasks.executeTask).mockResolvedValue({ _id: 'id' } as any)
      vi.mocked(tasks.onDidEndTaskProcess).mockImplementation((x) =>
        x({
          execution: {
            _id: 'id',
          },
          exitCode: 1,
        } as any),
      )

      await handler['_cloneProject'](
        progress,
        { fsPath: '/bar/foo' } as any,
        '/foo/bar',
        'README.md',
      )

      expect(window.showErrorMessage).toBeCalledTimes(1)
    })

    it('should finish clone process', async () => {
      vi.mocked(tasks.executeTask).mockResolvedValue({ _id: 'id' } as any)
      vi.mocked(tasks.onDidEndTaskProcess).mockImplementation((x) =>
        x({
          execution: {
            _id: 'id',
          },
          exitCode: 0,
        } as any),
      )

      await handler['_cloneProject'](
        progress,
        { fsPath: '/bar/foo' } as any,
        '/foo/bar',
        'README.md',
      )

      expect(progress.report).toBeCalledWith({ increment: 100 })
      expect(commands.executeCommand).toBeCalledWith(
        'vscode.openFolder',
        { fsPath: '/bar/foo' },
        { forceNewWindow: true },
      )
    })
  })
})
