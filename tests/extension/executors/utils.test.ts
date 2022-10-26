import { describe, expect, test, vi } from 'vitest'
import { workspace } from 'vscode'

import { getShellWorkingDirectory } from '../../../src/extension/executors/utils'
import { CWD_SETTING_OPTIONS } from '../../../src/extension/constants'

vi.mock('vscode', () => {
  const config = new Map()
  return {
    workspace: {
      config,
      workspaceFolders: [{
        uri: { fsPath: '/bar/foo' }
      }, {
        uri: { fsPath: '/foo/bar' }
      }],
      getConfiguration: vi.fn().mockReturnValue(config)
    }
  }
})


describe('getShellWorkingDirectory', () => {
  const exec: any = {
    cell: {
      document: {
        getText: vi.fn(),
        uri: { fsPath: '/foo/bar/file.md' }
      }
    }
  }

  test('returns relative from markdown as default', () => {
    expect(getShellWorkingDirectory(exec)).toBe('/foo/bar')
  })

  test('returns relative from workspace if set', () => {
    // @ts-expect-error mock feature
    workspace.config.set('workingDirectory', CWD_SETTING_OPTIONS.RelativeToWorkspaceDir)
    expect(getShellWorkingDirectory(exec)).toBe('/bar/foo')
  })
})
