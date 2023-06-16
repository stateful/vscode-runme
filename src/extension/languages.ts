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
    return Languages.biased(platform, results)
  }

  public static fromContext(context: vscode.ExtensionContext) {
    const basePath = context.extensionUri.fsPath
    return new Languages(basePath)
  }

  public static biased(platform: string, results: ModelResult[]): string | undefined {
    let top = results.slice(0, 3)
    const pstdev = Math.sqrt(stdev(top.map(r => r.confidence), true))
    // if it's tight at the top (< 1% variance) look for execs
    while (pstdev < 0.01 && !LANGUAGES.get(top[0]?.languageId) && top.shift()) {
      if (top.length <= 0) {
        top = results
        break
      }
    }
    const languageId = top[0]?.languageId
    return LANGUAGES.get(languageId) || languageId
  }

  public static normalizeSource(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter(l => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
    return normed.join('\n')
  }
}

// https://www.w3resource.com/javascript-exercises/fundamental/javascript-fundamental-exercise-225.php
const stdev = (arr: any[], usePopulation = false) => {
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length
  return arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc: any, val: any) => acc + val, 0) /
    (arr.length - (usePopulation ? 0 : 1))
}
