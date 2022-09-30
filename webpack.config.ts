import path from 'node:path'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import type { Configuration } from "webpack"

const baseConfig: Partial<Configuration> = {
  mode: process.env.NODE_ENV ? 'production' : 'development',
  devtool: "source-map",
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
    level: "log", // enables logging required for problem matchers
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: "ts-loader" }],
      },
    ],
  }
}

const rendererConfig: Configuration = {
  ...baseConfig,
  entry: path.resolve('src', 'client', 'index.ts'),
  experiments: { outputModule: true },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "client.js",
    libraryTarget: 'module',
    chunkFormat: 'module'
  },
  target: 'web'
}

const extensionConfig: Configuration = {
  ...baseConfig,
  target: "node",
  entry: {
    extension: path.resolve(__dirname, "src", "extension", "extension.ts"),
  },
  externals: ['vscode', 'vercel', '@vercel/client', 'keyv', 'vite', 'react-refresh'],
  output: {
    path: path.resolve(__dirname, "out"),
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  }
}

export default [extensionConfig, rendererConfig]
