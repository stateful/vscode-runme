import {
  ConfigurationChangeEvent,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from 'vscode'

type Environment = {
  label: string
  description: string
  id: string
} | null

export class EnvironmentManager {
  private context: ExtensionContext
  private environment: Environment = null
  private statusBarItem!: StatusBarItem

  constructor(context: ExtensionContext) {
    this.context = context
    this.context.subscriptions.push(
      workspace.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this)),
    )
    if (this.isEnabled()) {
      this.registerStatusbar()
    }
  }

  isEnabled() {
    const config = workspace.getConfiguration('runme.experiments')
    return config.get<boolean>('environments', false) === true
  }

  setEnv(environment: Environment) {
    this.environment = environment
    this.updateCtx(this.environment)
    this.statusBarItem.text = this.environment
      ? `Environments (${environment?.label})`
      : 'Environments'
  }

  getEnv() {
    return this.environment
  }

  private registerStatusbar() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100)
    this.setEnv(this.getCtx())
    this.statusBarItem.command = 'runme.environments'
    this.statusBarItem.show()
  }

  private getCtx() {
    return (this.context.globalState.get('environment') || null) as Environment
  }

  private updateCtx(environment: Environment) {
    this.context.globalState.update('environment', environment)
  }

  private onDidChangeConfiguration(event: ConfigurationChangeEvent) {
    if (!event.affectsConfiguration('runme.experiments.environments')) {
      return
    }
    if (this.isEnabled()) {
      this.registerStatusbar()
    } else {
      this.statusBarItem.dispose()
    }
  }
}
