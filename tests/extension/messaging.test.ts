import { expect, vi, test, suite, beforeEach } from 'vitest'
import { Disposable, FileType, workspace, window, Uri, ExtensionContext } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import {
  DisplayableMessage,
  MessagingBuilder,
  RecommendExtensionMessage,
} from '../../src/extension/messaging'

vi.mock('vscode', async () => {
  const vscode = await import('../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
    workspace: {
      ...vscode.workspace,
      openTextDocument: vi.fn().mockReturnValue({
        getText: vi.fn().mockReturnValue(
          JSON.stringify({
            recommendations: ['stateful.runme'],
          }),
        ),
      }),
    },
  }
})

vi.mock('vscode')

vi.mock('vscode-telemetry')

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

class MockMessage extends DisplayableMessage implements Disposable {
  dispose(): void {}
  display(): void {}
}

const contextMock: ExtensionContext = {
  globalState: {
    get: vi.fn().mockReturnValue(true),
    update: vi.fn().mockResolvedValue({}),
  },
} as any

suite('MessageBuilder', () => {
  test('On Activate should display all displayable messages', () => {
    const mockMessage = new MockMessage(contextMock)
    const messageBuilder = new MessagingBuilder([mockMessage, mockMessage])
    const mockMessageSpy = vi.spyOn(mockMessage, 'display')
    messageBuilder.activate()
    expect(mockMessageSpy).toHaveBeenCalledTimes(2)
  })

  test('On Dispose should dispose all displayable messages', () => {
    const mockMessage = new MockMessage(contextMock)
    const messageBuilder = new MessagingBuilder([mockMessage, mockMessage])
    const mockMessageSpy = vi.spyOn(mockMessage, 'dispose')
    messageBuilder.dispose()
    expect(mockMessageSpy).toHaveBeenCalledTimes(2)
  })
})

suite('RecommendExtensionMessage', () => {
  beforeEach(() => {
    vi.mocked(window.showInformationMessage).mockClear()
    vi.mocked(workspace.fs.writeFile).mockClear()
  })

  test('It should not prompt the user to install the extension when already added', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    await recommendExtension.display()
    expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
    expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
  })

  test('It should add the extension when selecting "Yes" option', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockReturnValue(
        JSON.stringify({
          recommendations: ['microsoft.docker'],
        }),
      ),
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('Yes' as any)
    await recommendExtension.display()
    expect(workspace.fs.writeFile).toBeCalledTimes(1)
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'true',
      error: 'false',
    })
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'Runme added successfully to the recommended extensions',
    )
  })

  test('It should create a .vscode folder when needed', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockResolvedValue(false as any)
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockReturnValue(
        JSON.stringify({
          recommendations: ['microsoft.docker'],
        }),
      ),
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('Yes' as any)
    await recommendExtension.display()
    expect(workspace.fs.createDirectory).toBeCalledTimes(1)
    expect(workspace.fs.createDirectory).toHaveBeenCalledWith(Uri.parse('/runme/workspace/.vscode'))
    expect(workspace.fs.writeFile).toBeCalledTimes(1)
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'Runme added successfully to the recommended extensions',
    )
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'true',
      error: 'false',
    })
  })

  test('It should create a .vscode/extensions.json file when needed', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockImplementation(async (param: Uri) => {
      return param.path === '/runme/workspace/.vscode/extensions.json'
        ? { type: FileType.Unknown }
        : ({ type: FileType.Directory } as any)
    })
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockReturnValue(
        JSON.stringify(
          {
            recommendations: ['microsoft.docker'],
          },
          null,
          2,
        ),
      ),
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('Yes' as any)
    await recommendExtension.display()
    const writeFileCalls = vi.mocked(workspace.fs.writeFile).mock.calls[0]
    expect(workspace.fs.writeFile).toHaveBeenCalledOnce()
    expect((writeFileCalls[0] as Uri).path).toStrictEqual(
      '/runme/workspace/.vscode/extensions.json',
    )
    expect((writeFileCalls[1] as Buffer).toString('utf-8')).toStrictEqual(
      JSON.stringify(
        {
          recommendations: ['stateful.runme'],
        },
        null,
        2,
      ),
    )
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'Runme added successfully to the recommended extensions',
    )
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'true',
      error: 'false',
    })
  })

  test('It should not add the extension when selecting "No" option', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockReturnValue(
        JSON.stringify(
          {
            recommendations: ['microsoft.docker'],
          },
          null,
          2,
        ),
      ),
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('No' as any)
    await recommendExtension.display()
    expect(workspace.fs.writeFile).toBeCalledTimes(0)
    expect(window.showInformationMessage).toBeCalledTimes(1)
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'false',
      error: 'false',
    })
  })

  test('It should report on failure and display a message', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockImplementation(new Error('Failure') as any),
    })
    await recommendExtension.display()
    expect(window.showErrorMessage).toHaveBeenCalledWith(
      'Failed to add Runme to the recommended extensions',
    )
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'false',
      error: 'true',
    })
  })

  test("It should not prompt when selecting don't ask again", async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any)
    vi.mocked(workspace.openTextDocument as any).mockResolvedValue({
      getText: vi.fn().mockReturnValue(
        JSON.stringify(
          {
            recommendations: ['microsoft.docker'],
          },
          null,
          2,
        ),
      ),
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce("Don't ask again" as any)
    const spy = vi.spyOn(contextMock.globalState, 'update')
    await recommendExtension.display()
    expect(workspace.fs.writeFile).toBeCalledTimes(0)
    expect(TelemetryReporter.sendTelemetryEvent).toBeCalledWith('runme.recommendExtension', {
      added: 'false',
      error: 'false',
    })
    expect(spy).toHaveBeenCalledWith('runme.recommendExtension', false)
  })

  test('Should not prompt for multi-root workspaces when using the command palette', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock, {
      'runme.recommendExtension': true,
    })
    // @ts-expect-error
    workspace.workspaceFolders = [
      { uri: Uri.file('/Users/user/Projects/project1') },
      { uri: Uri.file('/Users/user/Projects/project2') },
    ]
    await recommendExtension.display()
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      'Multi-root workspace are not supported',
    )
  })

  test('Should not prompt for multi-root workspaces', async () => {
    const recommendExtension = new RecommendExtensionMessage(contextMock)
    // @ts-expect-error
    workspace.workspaceFolders = [
      { uri: Uri.file('/Users/user/Projects/project1') },
      { uri: Uri.file('/Users/user/Projects/project2') },
    ]
    await recommendExtension.display()
    expect(window.showInformationMessage).toHaveBeenCalledTimes(0)
    expect(workspace.fs.writeFile).toHaveBeenCalledTimes(0)
  })
})
