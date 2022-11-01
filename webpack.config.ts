import path from 'node:path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import WebpackCopy from 'copy-webpack-plugin'
import { BannerPlugin } from 'webpack'
import type { Configuration } from 'webpack'

const DIRNAME_SUPPORT = /*ts*/`
import __pathBanner from 'node:path';
import __urlBanner from 'node:url';

const __dirname = __pathBanner.dirname(__urlBanner.fileURLToPath(import.meta.url))
`

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

const viteServerConfig: Configuration = {
  ...rendererConfig,
  entry: path.resolve(__dirname, 'src', 'server', 'index.ts'),
  output: {
    ...rendererConfig.output,
    path: path.resolve(__dirname, 'out', 'server'),
    filename: 'server.js',
  },
  plugins: [
    ...rendererConfig.plugins || [],
    new WebpackCopy({
      patterns: [
        { from: 'src/server/package.json', to: 'package.json' },
      ]
    }),
    new BannerPlugin({
      banner: DIRNAME_SUPPORT,
      raw: true
    })
  ],
  externals: [
    'vite', 'yargs', 'yargs/helpers', 'get-port',
    '@babel/core', 'yargs-parser', '@vitejs/plugin-react',
    'vite-plugin-ssr', 'tailwindcss', '@sveltejs/vite-plugin-svelte'
  ],
  target: 'node',
  module: {
    parser: {
      javascript : { importMeta: false }
    },
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: 'src/server/tsconfig.json'
          }
        }]
      },
    ],
  }
}

const extensionConfig: Configuration = {
  ...baseConfig,
  target: 'node',
  entry: {
    extension: path.resolve(__dirname, 'src', 'extension', 'index.ts'),
  },
  externals: ['vscode', 'vercel', '@vercel/client', 'keyv'],
  output: {
    path: path.resolve(__dirname, 'out'),
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  }
}

export default [extensionConfig, rendererConfig, viteServerConfig]
