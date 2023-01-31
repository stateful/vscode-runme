import { describe, it, expect, vi, beforeEach } from 'vitest'
// @ts-expect-error mock feature
import { commands, window, Uri, terminal } from 'vscode'

import { RunmeUriHandler } from '../../../src/extension/handler/uri'
import {
    getProjectDir, waitForProjectCheckout, getSuggestedProjectName
} from '../../../src/extension/handler/utils'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/handler/utils', () => ({
    getProjectDir: vi.fn(),
    getTargetDirName: vi.fn(),
    waitForProjectCheckout: vi.fn(),
    getSuggestedProjectName: vi.fn()
}))

describe('RunmeUriHandler', () => {
    beforeEach(() => {
        vi.mocked(window.showErrorMessage).mockClear()
        vi.mocked(window.showInformationMessage).mockClear()
    })

    describe('handleUri', async () => {
        let handler: RunmeUriHandler

        beforeEach(() => {
            handler = new RunmeUriHandler()
            handler['_setupProject'] = vi.fn()
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
                repository: 'git@github.com:/foo/bar'
            }} as any)
            await handler.handleUri(Uri.parse('vscode://stateful.runme?foo=bar'))
            expect(handler['_setupProject']).toBeCalledWith('git@github.com:/foo/bar')
        })
    })

    describe('_setupProject', () => {
        let handler: RunmeUriHandler

        beforeEach(() => {
            handler = new RunmeUriHandler()
        })

        it('doesn not do anything if repository was not provided', async () => {
            await handler['_setupProject']()
            expect(window.showErrorMessage)
                .toBeCalledWith('No project to setup was provided in the url')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
        })

        it('should not run if project dir or suggested name can not be identified', async () => {
            await handler['_setupProject']('foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            await handler['_setupProject']('foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
            vi.mocked(getProjectDir).mockResolvedValueOnce('foobar' as any)
            vi.mocked(getSuggestedProjectName).mockResolvedValueOnce('stateful/runme')
            await handler['_setupProject']('foo')
            expect(window.showInformationMessage).toHaveBeenCalledTimes(1)
            expect(window.withProgress).toHaveBeenCalledTimes(1)
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
                async (_, __, resolve) => resolve(false))
            await handler['_cloneProject'](progress, { fsPath: '/bar/foo' } as any, '/foo/bar')
            expect(terminal.sendText).toBeCalledWith('git clone /foo/bar /bar/foo')
            expect(terminal.dispose).toBeCalledTimes(1)
            expect(progress.report).toBeCalledTimes(1)
        })

        it('should finish clone process', async () => {
            vi.mocked(waitForProjectCheckout).mockImplementation(
                async (_, __, resolve) => resolve(true))
            await handler['_cloneProject'](progress, { fsPath: '/bar/foo' } as any, '/foo/bar')
            expect(progress.report).toBeCalledWith({ increment: 100 })
            expect(terminal.dispose).toBeCalledTimes(1)
            expect(commands.executeCommand).toBeCalledWith(
                'vscode.openFolder',
                {
                    query: {
                        command: 'setup',
                        repository: 'git@github.com:/foo/bar'
                    }
                },
                { forceNewWindow: true }
            )
        })
    })
})
