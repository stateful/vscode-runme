---
runme:
  id: 01HF7B0KK19BHGNZ0X1W17ZEYB
  version: v3
---

## ⛔️  This feature is deprecated

BranchGPT is deprecated and no longer available in the `runme` CLI.

If you have feedback / questions [Join our Community](https://runme.dev/community)

# Enter BranchGPT

[![](https://badgen.net/badge/Run%20this%20/Demo/5B3ADF?icon=https://runme.dev/runme_logo.svg)](https://runme.dev/api/runme?repository=https://github.com/stateful/vscode-runme.git&fileToOpen=examples/branchGPT.md)

A humerous attempt to use GPT3/3.5/4 and Git Merge Commit to suggest new branch names.

![BranchGPT in Action](https://media.graphassets.com/SyNFcxcHRG2PHtqCXCNx)

Check out [this blog post](https://stateful.com/blog/branchgpt-ai-powered-branch-names) for more background.

On Windows, install via scoop (https://scoop.sh):

```sh {"id":"01HF7B0KK19BHGNZ0X1R6DYC4Q"}
$ scoop bucket add stateful https://github.com/stateful/scoop-bucket.git
$ scoop install stateful/runme
```

On macOS, install via Homebrew (https://brew.sh):

```sh {"id":"01HF7B0KK19BHGNZ0X1RHE5KZF"}
$ brew install stateful/tap/runme
```

Binaries are also available at https://github.com/stateful/runme/releases/latest

## Demo

Just enter some free-flow description and voilà, get some branch suggestions:

```sh {"id":"01HF7B0KK19BHGNZ0X1RZ0VZW3"}
$ runme branchGPT
```

_Read the docs on [runme.dev](https://www.runme.dev/docs/intro) to learn how to get most out of Runme notebooks!_
