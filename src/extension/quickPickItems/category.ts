import type { QuickPickItem } from 'vscode'

import { CATEGORY_SEPARATOR } from '../../constants'

export default class CategoryQuickPickItem implements QuickPickItem {
  public readonly description?: string
  public readonly detail?: string

  constructor(
    public readonly label: string,
    isNew = false,
  ) {
    if (isNew) {
      this.description = 'Add as new tag'
      this.detail = CategoryQuickPickItem.isValid(label)
        ? '(Select, press save and enter)'
        : 'Error: tag name can not contain a comma or space'
    }
  }

  get value(): string {
    return this.label
  }

  isValid(): boolean {
    return CategoryQuickPickItem.isValid(this.label)
  }

  isNew(): boolean {
    return Boolean(this.description)
  }

  static isValid(label: string): boolean {
    return !label.includes(CATEGORY_SEPARATOR) && !label.includes(' ')
  }
}
