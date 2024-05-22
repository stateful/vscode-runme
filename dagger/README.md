---
cwd: ..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
---

```sh {"id":"01HXF9X7750APY0DB81KPPZBN5"}
export PROGRESS_OUTPUT="plain"
```

```sh {"id":"01HTNVRK3AJ2AT8M24TA996RCJ","terminalRows":"15"}
dagger -m vscode-runme functions
```

```sh {"id":"01HTQBSZTS5M1HP3GGP4T99PT0","name":"KERNEL_BINARY","terminalRows":"28"}
dagger call --progress $PROGRESS_OUTPUT \
  -m golang \
  --src ../runme \
  build \
  file \
    --output /tmp/runme/runme \
    --path runme
```

```sh {"id":"01HTNZBARHB97RPQPCVQZ7PNRN","name":"EXTENSION_VSIX","terminalRows":"25"}
dagger --progress $PROGRESS_OUTPUT \
  call \
  with-remote \
    --remote "github.com/stateful/vscode-runme" \
    --ref "main" \
  with-container \
    --binary /tmp/runme/runme \
    --presetup dagger/scripts/presetup.sh \
  build-extension \
    --gh-token $(gh auth token)
```
