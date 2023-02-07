import { describe, it, expect, vi, beforeEach } from 'vitest'
// @ts-expect-error mock feature
import { commands, window, Uri, terminal, workspace } from 'vscode'
import got from 'got'
import { TelemetryReporter } from 'vscode-telemetry'

import { RunmeUriHandler } from '../../../src/extension/handler/uri'
import {
    getProjectDir, waitForProjectCheckout, getSuggestedProjectName, writeBootstrapFile
} from '../../../src/extension/handler/utils'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/handler/utils', () => ({
    getProjectDir: vi.fn(),
    getTargetDirName: vi.fn(),
    waitForProjectCheckout: vi.fn(),
    getSuggestedProjectName: vi.fn(),
    writeBootstrapFile: vi.fn()
}))
vi.mock('got', () => ({
    default: { get: vi.fn().mockResolvedValue({ body: 'some markdown' }) }
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
            handler = new RunmeUriHandler()
            handler['_setupProject'] = vi.fn()
            handler['_setupFile'] = vi.fn()
        })

        it('should fail if no command was found', async () => {
            vi.mocked(Uri.parse).mockReturnValue({ query: {} } as any)
            expect(await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar')))
                .toBe(undefined)
            expect(window.showErrorMessage).toBeCalledWith('No query parameter "command" provided')
        })

        it('should fail if no command was recognised', async () => {
            vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'foobar' } } as any)
            expect(await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar')))
                .toBe(undefined)
            expect(window.showErrorMessage).toBeCalledWith('Couldn\'t recognise command "foobar"')
        })

        it('runs _setupProject if command was "setup"', async () => {
            vi.mocked(Uri.parse).mockReturnValue({ query: {
                command: 'setup',
                fileToOpen: '/sub/file.md',
                repository: 'git@github.com:/foo/bar'
            }} as any)
            await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))
            expect(handler['_setupProject']).toBeCalledWith('/sub/file.md', 'git@github.com:/foo/bar')
            expect(TelemetryReporter.sendTelemetryEvent)
              .toBeCalledWith('extension.uriHandler', { command: 'setup', type: 'project' })
        })

        it('runs _setupFile if command was "setup" but no repository param', async () => {
            const fileToOpen = 'https://raw.githubusercontent.com/stateful/vscode-runme/main/examples/k8s/README.md'
            vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'setup', fileToOpen }, fsPath: '/foo/bar' } as any)
            await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))
            expect(handler['_setupFile']).toBeCalledWith(fileToOpen)
            expect(TelemetryReporter.sendTelemetryEvent)
              .toBeCalledWith('extension.uriHandler', { command: 'setup', type: 'file' })
        })
    })

    describe('_setupProject', () => {
        let handler: RunmeUriHandler

        beforeEach(() => {
            handler = new RunmeUriHandler()
        })

        it('doesn not do anything if repository was not provided', async () => {
            await handler['_setupProject']('README.md')
            expect(window.showErrorMessage)
                .toBeCalledWith('No project to setup was provided in the url')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
        })

        it('should not run if project dir or suggested name can not be identified', async () => {
            await handler['_setupProject']('README.md', 'foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            await handler['_setupProject']('README.md', 'foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            vi.mocked(getSuggestedProjectName).mockResolvedValueOnce('stateful/runme')
            await handler['_setupProject']('README.md', 'foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(1)
            expect(window.withProgress).toHaveBeenCalledTimes(1)
        })
    })

    describe('_setupFile', () => {
        let handler: RunmeUriHandler

        beforeEach(() => {
            handler = new RunmeUriHandler()
        })

        it('shows warning if file is not a markdown', async () => {
            vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'setup' }, fsPath: '/foo/bar'} as any)
            await handler['_setupFile']('/foo/bar.js')
            expect(window.showErrorMessage)
                .toBeCalledWith('Parameter "fileToOpen" from URL is not a markdown file!')
            expect(getProjectDir).toBeCalledTimes(0)
        })

        it('should fail gracefully', async () => {
            vi.mocked(got.get).mockRejectedValueOnce(new Error('ups'))
            vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'setup' }, fsPath: '/foo/bar.md'} as any)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            await handler['_setupFile']('/foo/bar.md')
            expect(vi.mocked(window.showErrorMessage).mock.calls[0][0]).toMatch(/Failed to set-up/)
        })

        it('should create new dir with file and open VS Code', async () => {
            vi.mocked(Uri.parse).mockReturnValue({ query: { command: 'setup' }, fsPath: '/foo/bar.md'} as any)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            await handler['_setupFile']('/foo/bar.md')
            expect(workspace.fs.createDirectory).toBeCalledTimes(1)
            expect(workspace.fs.writeFile).toBeCalledTimes(1)
            expect(writeBootstrapFile).toBeCalledTimes(1)
            expect(commands.executeCommand).toBeCalledWith(
                'vscode.openFolder',
                expect.any(Object),
                { forceNewWindow: true }
            )
        })
    })

    describe('_cloneProject', () => {
        let handler: RunmeUriHandler
        const progress = { report: vi.fn() }

        beforeEach(() => {
            handler = new RunmeUriHandler()
            progress.report.mockClear()
            terminal.dispose.mockClear()
        })

        it('should return false if waitForProjectCheckout fails', async () => {
            vi.mocked(waitForProjectCheckout).mockImplementation(
                async (_, __, ___, resolve) => resolve(false))
            await handler['_cloneProject'](progress, { fsPath: '/bar/foo' } as any, '/foo/bar', 'README.md')
            expect(terminal.sendText).toBeCalledWith('git clone /foo/bar /bar/foo')
            expect(terminal.dispose).toBeCalledTimes(1)
            expect(progress.report).toBeCalledTimes(1)
        })

        it('should finish clone process', async () => {
            vi.mocked(Uri.parse).mockReturnValue('some url' as any)
            vi.mocked(waitForProjectCheckout).mockImplementation(
                async (_, __, ___, resolve) => resolve(true))
            await handler['_cloneProject'](progress, { fsPath: '/bar/foo' } as any, '/foo/bar', 'README.md')
            expect(progress.report).toBeCalledWith({ increment: 100 })
            expect(terminal.dispose).toBeCalledTimes(1)
            expect(commands.executeCommand).toBeCalledWith(
                'vscode.openFolder',
                'some url',
                { forceNewWindow: true }
            )
        })
    })
})
