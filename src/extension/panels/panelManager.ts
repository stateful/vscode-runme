import { Disposable, ExtensionContext } from 'vscode'

import Panel from './panel'

interface WebviewPanel {
  panel: Panel
  disposableWebViewProvider: Disposable
}

export default class PanelManager implements Disposable {
  private panels: Map<string, WebviewPanel> = new Map()

  constructor(readonly context: ExtensionContext) {}

  dispose() {
    this.panels.forEach((webviewPanel) => {
      webviewPanel.panel.dispose()
      webviewPanel.disposableWebViewProvider.dispose()
    })
  }

  public addPanel(webviewId: string, panel: Panel, disposableWebViewProvider: Disposable): void {
    this.panels.set(webviewId, { panel, disposableWebViewProvider })
  }

  public getPanel(webviewId: string) {
    const webviewPanel = this.panels.get(webviewId)
    return webviewPanel?.panel
  }
}
