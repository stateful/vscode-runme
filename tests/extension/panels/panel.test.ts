import { suite, test, expect, vi } from 'vitest'
import { workspace, Uri, type ExtensionContext, type WebviewView } from 'vscode'

import CloudPanel from '../../../src/extension/panels/cloud'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/extension/grpc/client', () => ({}))
vi.mock('../../../src/extension/runner', () => ({}))

vi.mock('vscode', async () => {
  const mocked = await import('../../../__mocks__/vscode')
  const SETTINGS_MOCK: any = { baseDomain: undefined }

  return {
    ...mocked,
    workspace: {
      getConfiguration: vi.fn().mockReturnValue({
        update: (configurationName: string, val: unknown) => {
          SETTINGS_MOCK[configurationName] = val
        },
        get: (configurationName) => {
          return SETTINGS_MOCK[configurationName]
        },
      }),
    },
  }
})

vi.mock('../../../src/extension/utils', () => {
  return {
    fetchStaticHtml: vi.fn().mockResolvedValue({
      text: vi
        .fn()
        .mockResolvedValue(
          '<script id="appAuthToken">window.APP_STATE = JSON.parse(\'{ "appToken": null }\');</script>',
        ),
    }),
  }
})

suite('Panel', () => {
  const staticHtml =
    '<script id="appAuthToken">window.APP_STATE = JSON.parse(\'{ "appToken": null }\');</script>'
  const contextMock: ExtensionContext = {
    extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
  } as any
  const view: WebviewView = { webview: { html: '' } } as any

  test('hydrates HTML', () => {
    const p = new CloudPanel(contextMock, 'testing')
    const hydrated = p.hydrateHtml(staticHtml, {
      appToken: 'a.b.c',
      ide: 'code',
      panelId: 'main',
      defaultUx: 'panels',
      themeKind: 1,
    })

    expect(hydrated).toContain('<base href="https://platform.stateful.com/">')
    expect(hydrated).toContain(
      '{"appToken":"a.b.c","ide":"code","panelId":"main","defaultUx":"panels","themeKind":1}',
    )
  })

  test('resolves authed', async () => {
    const p = new CloudPanel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue({ token: 'webview.auth.token' })

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="https://platform.stateful.com/">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"webview.auth.token","defaultUx":"panels","themeKind":1}',
    )
  })

  test('resolves unauthed', async () => {
    const p = new CloudPanel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue(null)

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="https://platform.stateful.com/">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"EMPTY","defaultUx":"panels","themeKind":1}',
    )
  })

  test('resolves authed localhost', async () => {
    workspace.getConfiguration().update('baseDomain', 'localhost')
    const p = new CloudPanel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue({ token: 'webview.auth.token' })

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="http://localhost:4001/">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"webview.auth.token","defaultUx":"panels","themeKind":1}',
    )
  })

  test('resolves unauthed localhost', async () => {
    workspace.getConfiguration().update('baseDomain', 'localhost')
    const p = new CloudPanel(contextMock, 'testing')
    p.getAppToken = vi.fn().mockResolvedValue(null)

    await p.resolveWebviewTelemetryView(view)

    expect(view.webview.html).toContain('<base href="http://localhost:4001/">')
    expect(view.webview.html).toContain(
      '{"ide":"code","panelId":"testing","appToken":"EMPTY","defaultUx":"panels","themeKind":1}',
    )
  })
})
