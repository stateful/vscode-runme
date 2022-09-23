import path from 'node:path'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import type { Configuration } from "webpack"

const makeConfig = (argv, args: Partial<Configuration>): Configuration => ({
  ...args,
  mode: argv.mode,
  devtool: argv.mode === 'production' ? false : 'inline-source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader',
      options: {
        configFile: path.join(path.dirname(args.entry as string), 'tsconfig.json'),
        // transpileOnly enables hot-module-replacement
        transpileOnly: true,
        compilerOptions: {
          // Overwrite the noEmit from the client's tsconfig
          noEmit: false,
        },
      },
    }, {
      test: /\.css$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            modules: true,
          },
        },
      ],
    }],
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.join(path.dirname(args.entry as string), 'tsconfig.json'),
      }
    })
  ],
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  }
})

export default (_: never, argv) => [
  makeConfig(argv, {
    entry: './src/client/index.ts',
    output: {
      path: path.join(__dirname, path.dirname('./out/client/index.js')),
      filename: path.basename('./out/client/index.js'),
      libraryTarget: 'module',
      chunkFormat: 'module'
    },
    target: 'web',
    experiments: { outputModule: true }
  }),
  makeConfig(argv, {
    entry: './src/extension/extension.ts',
    output: {
      path: path.join(__dirname, path.dirname('./out/extension/extension.js')),
      filename: path.basename('./out/extension/extension.js'),
      libraryTarget: 'commonjs',
      chunkFormat: 'commonjs'
    },
    target: 'node'
  }),
]
