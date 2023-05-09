/**
 * Note: this file is used within Node.js and Browser environment.
 * Only export cross compatible objects here.
 */

export enum OutputType {
  vercel = 'stateful.runme/vercel-stdout',
  deno = 'stateful.runme/deno-stdout',
  outputItems = 'stateful.runme/output-items',
  annotations = 'stateful.runme/annotations',
  terminal = 'stateful.runme/terminal',
  error = 'stateful.runme/error',
  github = 'stateful.runme/github-stdout'
}

export enum ClientMessages {
  infoMessage = 'common:infoMessage',
  errorMessage = 'common:errorMessage',
  closeCellOutput = 'common:closeCellOutput',
  denoUpdate = 'deno:deploymentUpdate',
  denoPromote = 'deno:promoteDeployment',
  vercelProd = 'vercel:promotePreview',
  mutateAnnotations = 'annotations:mutate',
  terminalStdout = 'terminal:stdout',
  terminalStderr = 'terminal:stderr',
  terminalStdin = 'terminal:stdin',
  terminalResize = 'terminal:resize',
  terminalFocus = 'terminal:focus',
  terminalOpen = 'terminal:open',
  openLink = 'terminal:openLink',
  activeThemeChanged = 'theme:changed',
  githubWorkflowDispatch = 'github:workflowDispatch',
  githubWorkflowDeploy = 'github:workflowDeploy',
  githubWorkflowStatusUpdate = 'github:workflowStatusUpdate'
}

// [pretty print, languageId, destination]
export const LANGUAGES = new Map([
  ['Assembly', 'asm', 'sh'],
  ['Batchfile', 'bat', 'sh'],
  ['C', 'c', undefined],
  ['C#', 'cs', undefined],
  ['C++', 'cpp', undefined],
  ['Clojure', 'clj', undefined],
  ['CMake', 'cmake', 'sh'],
  ['COBOL', 'cbl', 'null'],
  ['CoffeeScript', 'coffee', 'html'],
  ['CSS', 'css', undefined],
  ['CSV', 'csv', undefined],
  ['Dart', 'dart', undefined],
  ['DM', 'dm', undefined],
  ['Dockerfile', 'dockerfile', 'sh'],
  ['Elixir', 'ex', undefined],
  ['Erlang', 'erl', undefined],
  ['Fortran', 'f90', undefined],
  ['Go', 'go', undefined],
  ['Groovy', 'groovy', undefined],
  ['Haskell', 'hs', undefined],
  ['HTML', 'html', undefined],
  ['INI', 'ini', undefined],
  ['Java', 'java', undefined],
  ['JavaScript', 'js', undefined],
  ['JSON', 'json', undefined],
  ['Julia', 'jl', undefined],
  ['Kotlin', 'kt', undefined],
  ['Lisp', 'lisp', undefined],
  ['Lua', 'lua', undefined],
  ['Makefile', 'makefile', 'sh'],
  ['Markdown', 'md', undefined],
  ['Matlab', 'matlab', undefined],
  ['Objective-C', 'mm', undefined],
  ['OCaml', 'ml', undefined],
  ['Pascal', 'pas', undefined],
  ['Perl', 'pm', undefined],
  ['PHP', 'php', undefined],
  ['PowerShell', 'ps1', undefined],
  ['Prolog', 'prolog', undefined],
  ['Python', 'py', undefined],
  ['R', 'r', undefined],
  ['Ruby', 'rb', undefined],
  ['Rust', 'rs', undefined],
  ['Scala', 'scala', undefined],
  ['Shell', 'sh', 'sh'],
  ['SQL', 'sql', undefined],
  ['Swift', 'swift', undefined],
  ['TeX', 'tex', undefined],
  ['TOML', 'toml', undefined],
  ['TypeScript', 'ts', undefined],
  ['Verilog', 'v', undefined],
  ['Visual Basic', 'vba', undefined],
  ['XML', 'xml', undefined],
  ['YAML', 'yaml', undefined],
].map(([, source, dest]) => [source, dest]))

export const SERVER_ADDRESS = 'localhost'
export const SERVER_PORT = 7863

export const DEFAULT_PROMPT_ENV = true
