import { join } from 'node:path'

import { Disposable, ExtensionContext, Uri, window, workspace } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { EXTENSION_NAME, TELEMETRY_EVENTS } from '../constants'

import { fileOrDirectoryExists, getDefaultWorkspace, isMultiRootWorkspace } from './utils'

export abstract class DisplayableMessage {
  abstract dispose(): void
  abstract display(): void
  constructor(
    protected readonly context: ExtensionContext,
    readonly stateSettings?: Record<TELEMETRY_EVENTS, any>,
  ) {
    this.context = context
    this.stateSettings = stateSettings
  }
}

export class MessagingBuilder implements Disposable {
  /**
   * Represents a collection of DisplayableMessages, useful to display window messages.
   * @param messages Specify the displayable messages to show
   */
  constructor(private messages: DisplayableMessage[]) {
    this.messages = messages
  }

  dispose() {
    this.messages.forEach((d) => d.dispose())
  }

  /**
   * Display registered DisplayableMessages
   */
  activate() {
    for (const message of this.messages) {
      message.display()
    }
  }
}

export class RecommendExtensionMessage extends DisplayableMessage implements Disposable {
  async display(): Promise<void> {
    try {
      const skipPrompSettings =
        this.stateSettings && this.stateSettings[TELEMETRY_EVENTS.RecommendExtension]
      let promptUser =
        skipPrompSettings || this.context.globalState.get(TELEMETRY_EVENTS.RecommendExtension, true)
      // Multi-root workspace not supported atm
      const isMultiRoot = isMultiRootWorkspace()
      if (isMultiRoot && skipPrompSettings) {
        window.showInformationMessage('Multi-root workspace are not supported')
        return
      }
      const workspaceRoot = getDefaultWorkspace()
      if (!workspaceRoot || isMultiRoot) {
        return
      }
      const extensionsFile = Uri.parse(join(workspaceRoot, '.vscode/extensions.json'))
      const extensionfileOrDirectoryExists = await fileOrDirectoryExists(extensionsFile)
      let extensionRecommendations: string[] = []
      if (extensionfileOrDirectoryExists) {
        const extensionDocument = await workspace.openTextDocument(extensionsFile)
        const extensionContents = JSON.parse(extensionDocument.getText())
        const { recommendations }: Record<string, string[]> = extensionContents
        extensionRecommendations = recommendations
        if (recommendations.includes(EXTENSION_NAME)) {
          promptUser = false
        }
      }

      if (!promptUser) {
        return
      }

      // eslint-disable-next-line max-len
      const answer = await window.showInformationMessage(
        'Would you like to add Runme to the recommended extensions?',
        'Yes',
        'No',
        "Don't ask again",
      )
      if (answer !== 'Yes') {
        TelemetryReporter.sendTelemetryEvent(TELEMETRY_EVENTS.RecommendExtension, {
          added: 'false',
          error: 'false',
        })
        if (answer === "Don't ask again") {
          await this.context.globalState.update(TELEMETRY_EVENTS.RecommendExtension, false)
        }
        return
      }

      const folderUri = Uri.parse(join(workspaceRoot, '.vscode'))
      const dirExists = await fileOrDirectoryExists(folderUri)
      if (!dirExists) {
        await workspace.fs.createDirectory(folderUri)
      }

      const recommendations = extensionfileOrDirectoryExists
        ? extensionRecommendations.push(EXTENSION_NAME) && extensionRecommendations
        : [EXTENSION_NAME]
      await workspace.fs.writeFile(
        extensionsFile,
        Buffer.from(
          JSON.stringify(
            {
              recommendations,
            },
            null,
            2,
          ),
        ),
      )

      window.showInformationMessage('Runme added successfully to the recommended extensions')
      TelemetryReporter.sendTelemetryEvent(TELEMETRY_EVENTS.RecommendExtension, {
        added: 'true',
        error: 'false',
      })
    } catch (error) {
      window.showErrorMessage('Failed to add Runme to the recommended extensions')
      TelemetryReporter.sendTelemetryEvent(TELEMETRY_EVENTS.RecommendExtension, {
        added: 'false',
        error: 'true',
      })
    }
  }

  dispose() {}
}
