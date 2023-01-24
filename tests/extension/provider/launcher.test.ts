import { vi, describe, it, expect } from 'vitest'
import {  commands } from 'vscode'

import { RunmeFile, RunmeLauncherProvider } from '../../../src/extension/provider/launcher'
import { getDefaultWorkspace } from '../../../src/extension/utils'


vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/extension/utils', () => ({
  getPathType: vi.fn().mockResolvedValue(1),
  getDefaultWorkspace: vi.fn().mockReturnValue('runme/workspace/src'),
  mapGitIgnoreToGlobFolders: vi.fn().mockReturnValue([
    '**/modules/**',
    '**/out/**',
    '**/node_modules/**',
    '**/.vscode-test/**',
    '**/wasm/**',
    '**/coverage/**',
    '**/tests/e2e/logs/**',
    '**/tests/e2e/screenshots/**',
    '**/coverage/config/**',
    '**/abc/**/**',
    '**/a/**/b/**',
    '**/jspm_packages/**'
  ])
}))

describe('Runme Notebooks', () => {
  it('returns an empty tree for empty workspace', async () => {
    const launchProvider = new RunmeLauncherProvider()
    const treeItems = await launchProvider.getChildren()
    expect(treeItems).toStrictEqual([])
  })

  describe('when opening in a workspace', () => {
    const launchProvider = new RunmeLauncherProvider(getDefaultWorkspace())
    it('should return the items for the root folder', async () => {
      const treeItems = await launchProvider.getChildren()
      expect(treeItems.length).toStrictEqual(2)
    })

    it('should return the items for the selected folder', async () => {
      const element = new RunmeFile('runme/workspace/src', {
        collapsibleState: 0,
        tooltip: 'Click to open runme file',
        lightIcon: 'icon.gif',
        darkIcon: 'icon.gif',
        contextValue: 'markdown-file',
        onSelectedCommand: {
          arguments: [{ file: 'README.md', folderPath: 'runme/workspace/src' }],
          command: 'runme.openRunmeFile',
          title: 'README.md',
        },
      })
      const treeItems = await launchProvider.getChildren(element)
      expect(treeItems.length).toStrictEqual(3)
      expect(launchProvider.getTreeItem(element)).toStrictEqual(element)
    })

    it('should open a file using runme renderer', () => {
      RunmeLauncherProvider.openFile({ file: 'README.md', folderPath: 'runme/workspace/src' })
      expect(commands.executeCommand).toBeCalledTimes(1)
      expect(commands.executeCommand).toBeCalledWith('vscode.openWith', expect.any(String), 'runme')
    })
  })
})
