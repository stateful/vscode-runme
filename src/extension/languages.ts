import fs from 'node:fs'
import path from 'node:path'

import vscode from 'vscode'
import { ModelOperations, ModelResult } from '@vscode/vscode-languagedetection'

import { LANGUAGES } from '../constants'

export default class Languages {
  private readonly modulOperations: ModelOperations

  private static NODE_MODEL_JSON_FUNC = (basePath: string): () => Promise<{ [key: string]: any }> => {
    return async () => {
      return new Promise<any>((resolve, reject) => {
        fs.readFile(path.resolve(basePath, 'model', 'model.json'), (err, data) => {
          if (err) {
            reject(err)
            return
          }
          resolve(JSON.parse(data.toString()))
        })
      })
    }
  }

  private static NODE_WEIGHTS_FUNC = (basePath: string): () => Promise<ArrayBuffer> => {
    return async () => {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        fs.readFile(path.resolve(basePath, 'model', 'group1-shard1of1.bin'), (err, data) => {
          if (err) {
            reject(err)
            return
          }
          resolve(data.buffer)
        })
      })
    }
  }

  constructor(private readonly basePath: string) {
    this.modulOperations = new ModelOperations({
      minContentSize: 10,
      modelJsonLoaderFunc: Languages.NODE_MODEL_JSON_FUNC(this.basePath),
      weightsLoaderFunc: Languages.NODE_WEIGHTS_FUNC(this.basePath),
    })
  }

  public run(snippet: string): Promise<ModelResult[]> {
    return this.modulOperations.runModel(snippet)
  }

  public async guess(snippet: string, platform: string): Promise<string | undefined> {
    const results = await this.modulOperations.runModel(snippet)
    return Languages.weighted(platform, results)
  }

  public static fromContext(context: vscode.ExtensionContext) {
    const basePath = context.extensionUri.fsPath
    return new Languages(basePath)
  }

  // todo(sebastian): too naive; should really consider probabilities
  public static weighted(platform: string, results: ModelResult[]): string | undefined {
    const languageId = results?.[0].languageId
    return LANGUAGES.get(results?.[0].languageId) || languageId
  }
}
