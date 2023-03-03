import path from 'node:path'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Uri, workspace, window } from 'vscode'

import {
    getProjectDir, getTargetDirName, getSuggestedProjectName, parseParams, gitSSHUrlToHTTPS
} from '../../../src/extension/handler/utils'

vi.mocked(Uri.joinPath).mockImplementation(
    (base: any, ...input: string[]) => path.join('/some/path', ...input) as any)
vi.mock('vscode')
vi.mock('tmp-promise', () => ({
    dir: vi.fn().mockResolvedValue({ path: '/tmp/dir' })
}))

const config = workspace.getConfiguration()

beforeEach(() => {
    vi.mocked(workspace.fs.createDirectory).mockClear()
})

describe('getProjectDir', () => {
    it('should use a tmp dir if config is not set', async () => {
        expect(await getProjectDir()).toMatchObject({ path: '/tmp/dir' })
    })

    it('should return project dir if existing', async () => {
        config.set('projectDir', 'foobar')
        vi.mocked(workspace.fs.stat).mockResolvedValueOnce({} as any)
        expect(await getProjectDir()).toMatchObject({ path: '/foobar' })
    })

    it('should return null if user does not want to create new project dir', async () => {
        config.set('projectDir', 'foobar')
        vi.mocked(window.showInformationMessage).mockResolvedValue('No' as any)
        vi.mocked(workspace.fs.stat).mockRejectedValueOnce(new Error(''))
        expect(await getProjectDir()).toBe(null)
    })

    it('should create directory if approved', async () => {
        config.set('projectDir', 'foobar')
        vi.mocked(window.showInformationMessage).mockResolvedValue('Yes' as any)
        vi.mocked(workspace.fs.stat).mockRejectedValueOnce(new Error(''))
        expect(await getProjectDir()).toMatchObject({ path: '/foobar' })
        expect(workspace.fs.createDirectory).toBeCalledTimes(1)
    })
})

describe('getTargetDirName', () => {
    it('should throw if provided name does not match expected format', async () => {
        await expect(() => getTargetDirName({} as any, 'foobar')).rejects
            .toThrow('Invalid project directory suggestion: foobar')
    })

    it('creates org dir if needed and returns right target dir', async () => {
        vi.mocked(workspace.fs.stat).mockImplementation(async (param: any) => {
            if (param === '/some/path/stateful') {
                throw new Error('ups')
            }
            if (param === '/some/path/stateful/runme_10') {
                throw new Error('ups')
            }
            return {} as any
        })
        expect(await getTargetDirName({} as any, 'stateful/runme'))
            .toBe('stateful/runme_10')
        expect(workspace.fs.createDirectory).toBeCalledWith('/some/path/stateful')
    })
})

describe('getSuggestedProjectName', () => {
    it('should parse name correctly', () => {
        expect(getSuggestedProjectName('git@provider.com:org/project.git'))
            .toBe('org/project')
    })

    it('should parse name correctly', () => {
        expect(getSuggestedProjectName('https://provider.com/org/project.git'))
            .toBe('org/project')
    })

    it('should fail if format is not correct', () => {
        expect(getSuggestedProjectName('foobar')).toBe(undefined)
        expect(window.showErrorMessage).toBeCalledTimes(1)
    })
})

describe('parseParams', () => {
  it('should parse params to be used safely', () => {
    const usp = new URLSearchParams('fileToOpen=foo;bar loo&repository=git@github.com/org/project;foo bar.git')
    expect(parseParams(usp)).toEqual({
      fileToOpen: 'foo%3Bbar%20loo',
      repository: 'git@github.com/org/project%3Bfoo%20bar.git'
    })
  })
})

describe('gitSSHUrlToHTTPS', () => {
  it('should transform ssh urls into https ones', () => {
    expect(gitSSHUrlToHTTPS('git@provider.com:foo/bar.git'))
      .toBe('https://provider.com/foo/bar.git')
  })
})
