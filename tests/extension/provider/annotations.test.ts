import { vi, describe, it, expect } from 'vitest'
import { NotebookCellKind } from 'vscode'

import { AnnotationsStatusBarItem } from '../../../src/extension/provider/cellStatusBar/items/annotations'
import { Kernel } from '../../../src/extension/kernel'
import { OutputType } from '../../../src/constants'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/extension/grpc/client', () => ({
  ParserServiceClient: vi.fn(),
}))

vi.mock('../../../src/extension/utils', () => ({
  getAnnotations: vi.fn().mockReturnValue({
    type: 'stateful.runme/annotations',
    output: {
      annotations: {
        background: false,
        interactive: true,
        closeTerminalOnSuccess: true,
        mimeType: 'text/plain',
        name: 'npm-install',
        'runme.dev/id': '01HGVC6M8Y76XAGAY6MQ06F5XS',
      },
    },
  }),
  validateAnnotations: vi.fn(),
  replaceOutput: vi.fn(),
}))

vi.mock('../../../src/extension/runner', () => ({}))
vi.mock('../../../src/extension/grpc/runner/v1', () => ({}))

describe('AnnotationsStatusBarItem test suite', () => {
  const kernel = new Kernel({} as any)

  describe('getStatusBarItem', () => {
    it('should create a status bar item', () => {
      const annotationsProvider = new AnnotationsStatusBarItem(kernel)
      const cell = {
        metadata: {
          background: 'true',
        },
        executionSummary: {
          success: false,
        },
        kind: NotebookCellKind.Code,
      }

      const expectedItem = {
        label: '$(gear) Configure',
        alignment: 2,
        command: {
          title: 'Configure cell behavior',
          command: 'runme.toggleCellAnnotations',
          arguments: [cell],
        },
        tooltip: 'Click to configure cell behavior',
      }

      const statusBarItem = annotationsProvider.getStatusBarItem(cell as any)
      expect(statusBarItem).toEqual(expectedItem)
    })
  })

  describe('toggleCellAnnotations', () => {
    it('should clear the ouput when the annotation is already rendered', async () => {
      const annotationsProvider = new AnnotationsStatusBarItem(kernel)
      const cell = {
        metadata: {
          background: 'true',
        },
        executionSummary: {
          success: false,
        },
        kind: NotebookCellKind.Markup,
        outputs: [
          {
            items: [{ id: '', items: [], metadata: {}, mime: OutputType.annotations }],
          },
        ],
      }

      const toggleOutput = vi.fn()
      kernel.getCellOutputs = vi.fn().mockResolvedValue({
        toggleOutput,
      })
      await annotationsProvider.toggleCellAnnotations(cell as any)
      expect(toggleOutput).toBeCalledTimes(1)
      expect(toggleOutput).toBeCalledWith(OutputType.annotations)
    })

    it('should replace the output when the annotation is not rendered', async () => {
      const annotationsProvider = new AnnotationsStatusBarItem(kernel)
      const cell = {
        metadata: {
          background: 'true',
        },
        executionSummary: {
          success: false,
        },
        kind: NotebookCellKind.Markup,
        outputs: [],
      }

      const toggleOutput = vi.fn()
      kernel.getCellOutputs = vi.fn().mockResolvedValue({
        toggleOutput,
      })
      await annotationsProvider.toggleCellAnnotations(cell as any)
      expect(toggleOutput).toBeCalledTimes(1)
      expect(toggleOutput).toBeCalledWith(OutputType.annotations)
    })
  })
})
