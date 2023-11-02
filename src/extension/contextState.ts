import { commands } from 'vscode'

type AllowedValueTypes = string | boolean | number

export default class ContextState {
  static keys: Map<string, AllowedValueTypes> = new Map<string, AllowedValueTypes>()

  static async addKey(key: string, value: AllowedValueTypes) {
    ContextState.keys.set(key, value)
    return commands.executeCommand('setContext', key, value)
  }

  static getKey<T extends AllowedValueTypes>(key: string) {
    return ContextState.keys.get(key) as T
  }
}
