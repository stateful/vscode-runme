import { vi, describe, it, expect } from 'vitest';

import { RunmeFile, RunmeLauncherProvider } from '../../../src/extension/provider/launcher';
import { getDefaultWorkspace } from '../../../src/extension/utils';
import { TreeItemCollapsibleState } from '../../../__mocks__/vscode';

vi.mock('vscode');

describe('Runme Notebooks', () => {
  it('returns an empty tree for empty workspace', async () => {
    const launchProvider = new RunmeLauncherProvider();
    const treeItems = await launchProvider.getChildren();
    expect(treeItems).toStrictEqual([]);
  });

  describe('when opening in a workspace', () => {
    const launchProvider = new RunmeLauncherProvider(getDefaultWorkspace());
    it('should return the items for the root folder', async () => {
      const treeItems = await launchProvider.getChildren();
      expect(treeItems.length).toStrictEqual(2);
    });

    it('should return the items for the selected folder', async () => {
      const element = new RunmeFile('runme/workspace/src', {
        collapsibleState: TreeItemCollapsibleState.None,
        tooltip: 'Click to open runme file',
        lightIcon: 'icon.gif',
        darkIcon: 'icon.gif',
        contextValue: 'markdown-file',
        onSelectedCommand: {
          arguments: [{ file: 'README.md', folderPath: 'runme/workspace/src' }],
          command: 'runme.openRunmeFile',
          title: 'README.md',
        },
      });
      const treeItems = await launchProvider.getChildren(element);
      expect(treeItems.length).toStrictEqual(3);
    });
  });
});
