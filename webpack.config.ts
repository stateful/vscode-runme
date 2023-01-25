import path from 'node:path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import { Configuration, DefinePlugin } from 'webpack'

const baseConfig: Partial<Configuration> = {
  mode: process.env.NODE_ENV ? 'production' : 'development',
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.join(__dirname, 'tsconfig.json'),
      }
    })
  ],
  infrastructureLogging: {
    level: 'log', // enables logging required for problem matchers
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }],
      },
    ],
  }
}

const rendererConfig: Configuration = {
  ...baseConfig,
  entry: path.resolve('src', 'client', 'index.ts'),
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'client.js',
    libraryTarget: 'module',
    chunkFormat: 'module'
  },
  target: 'web'
}

const extensionConfig: Configuration = {
  ...baseConfig,
  target: 'node',
  entry: {
    extension: path.resolve(__dirname, 'src', 'extension', 'index.ts'),
  },
  externals: ['vscode'],
  output: {
    path: path.resolve(__dirname, 'out'),
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  plugins: [
    new DefinePlugin({
      INSTRUMENTATION_KEY: JSON.stringify(process.env.INSTRUMENTATION_KEY || 'invalid')
    })
  ]
}

export default [extensionConfig, rendererConfig]
