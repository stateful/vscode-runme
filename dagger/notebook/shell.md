---
runme:
  id: 01JJDCG2SQSGV0DP55XCR55AYM
  version: v3
shell: dagger shell
terminalRows: 20
---

# Compose Notebook Pipelines using the Dagger Shell

Let's get upstream artifacts ready. First, compile the Runme kernel binary.

```sh {"id":"01JJDCG2SPRDWGQ1F4Z6EH69EJ","name":"KERNEL_BINARY"}
github.com/purpleclay/daggerverse/golang $(git https://github.com/stateful/runme | head | tree) |
  build | 
  file runme
```

Then, grab the presetup.sh script to provision the build container.

```sh {"id":"01JJDCG2SQSGV0DP55X86EJFSZ","name":"PRESETUP","terminalRows":"14"}
git https://github.com/stateful/vscode-runme |
  head |
  tree |
  file dagger/scripts/presetup.sh
```

## Build the Runme VS Code Extension

Let's tie together above's artifacts via their respective cell names to build the Runme VS Code extension.

```sh {"id":"01JJDCG2SQSGV0DP55X8JVYDNR","name":"EXTENSION","terminalRows":"25"}
github.com/stateful/vscode-runme |
  with-remote github.com/stateful/vscode-runme main |
  with-container $(KERNEL_BINARY) $(PRESETUP) |
  build-extension GITHUB_TOKEN
```
