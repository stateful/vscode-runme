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

const WORKSPACE_STORAGE_KEY = 'runme.environments.current'

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

  setEnvironment(environment: Environment) {
    this.environment = environment
    this.updateCurrent(this.environment)
    this.statusBarItem.text = this.environment ? `${environment?.label} (env)` : 'Select env'
  }

  getEnvironment() {
    return this.environment
  }

  private registerStatusbar() {
    this.statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, -10)
    this.setEnvironment(this.getCurrent())
    this.statusBarItem.command = 'runme.environments'
    this.statusBarItem.show()
  }

  private getCurrent() {
    return (this.context.workspaceState.get(WORKSPACE_STORAGE_KEY) || null) as Environment
  }

  private updateCurrent(environment: Environment) {
    this.context.workspaceState.update(WORKSPACE_STORAGE_KEY, environment)
  }

  private onDidChangeConfiguration(event: ConfigurationChangeEvent) {
    if (!event.affectsConfiguration('runme.experiments.environments')) {
      return
    }
    if (this.isEnabled()) {
      this.registerStatusbar()
    }
  }
}
