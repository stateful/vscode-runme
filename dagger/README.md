---
cwd: ..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
terminalRows: 16
---

## List available functions

```sh {"excludeFromRunAll":"true","id":"01HTNVRK3AJ2AT8M24TA996RCJ","terminalRows":"15"}
dagger functions
```

## Build Kernel Binary

```sh {"id":"01HTQBSZTS5M1HP3GGP4T99PT0","name":"KERNEL_BINARY"}
dagger call \
  -m golang \
  --src ../runme \
  build \
  file \
    --output /tmp/runme/runme \
    --path runme
```

## Build Extension

```sh {"id":"01HTNZBARHB97RPQPCVQZ7PNRN","name":"EXTENSION_VSIX"}
dagger --progress=plain call \
  with-remote \
    --remote "github.com/runmedev/vscode-runme" \
    --ref "main" \
  with-container \
    --binary /tmp/runme/runme \
    --presetup dagger/scripts/presetup.sh \
  build-extension \
    --github-token-secret cmd:"gh auth token"
```
