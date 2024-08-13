---
cwd: ..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
terminalRows: 20
---

```sh {"id":"01HXF9X7750APY0DB81KPPZBN5","terminalRows":"5"}
export PROGRESS_OUTPUT="plain"
echo "Using $PROGRESS_OUTPUT for progress logging"
```

```sh {"excludeFromRunAll":"true","id":"01HTNVRK3AJ2AT8M24TA996RCJ","terminalRows":"15"}
dagger -m vscode-runme functions
```

```sh {"id":"01HTQBSZTS5M1HP3GGP4T99PT0","name":"KERNEL_BINARY"}
dagger call --progress $PROGRESS_OUTPUT \
  -m golang \
  --src ../runme \
  build \
  file \
    --output /tmp/runme/runme \
    --path runme
```

```sh {"id":"01HTNZBARHB97RPQPCVQZ7PNRN","name":"EXTENSION_VSIX"}
dagger call --progress $PROGRESS_OUTPUT \
  with-remote \
    --remote "github.com/stateful/vscode-runme" \
    --ref "main" \
  with-container \
    --binary /tmp/runme/runme \
    --presetup dagger/scripts/presetup.sh \
  build-extension \
    --github-token cmd:"gh auth token"
```
