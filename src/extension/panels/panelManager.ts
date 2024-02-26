import { Disposable, ExtensionContext } from 'vscode'

import { IPanel } from './base'

interface WebviewPanel {
  panel: IPanel
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

  public addPanel(webviewId: string, panel: IPanel, disposableWebViewProvider: Disposable): void {
    this.panels.set(webviewId, { panel, disposableWebViewProvider })
  }

  public getPanel(webviewId: string): IPanel | undefined {
    const webviewPanel = this.panels.get(webviewId)
    return webviewPanel?.panel
  }
}
