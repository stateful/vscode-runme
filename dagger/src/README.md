---
cwd: ../..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
---

```sh {"id":"01HTNVRK3AJ2AT8M24TA996RCJ"}
dagger -m vscode-runme functions
```

```sh {"id":"01HTQBSZTS5M1HP3GGP4T99PT0","name":"build-binary","terminalRows":"28"}
dagger call --progress auto \
  -m golang \
  --src ../runme \
  build \
  file \
    --output /Users/sourishkrout/Projects/stateful/oss/vscode-runme/bin/runme \
    --path runme
```

```sh {"id":"01HTNZBARHB97RPQPCVQZ7PNRN","name":"build-extension","terminalRows":"25"}
dagger --progress=plain \
  call \
  with-remote \
    --remote "github.com/stateful/vscode-runme" \
    --ref "4e3007e2920299b9491ea8f4c7aa9f33cc649afc" \
  with-container \
    --binary /Users/sourishkrout/Projects/stateful/oss/vscode-runme/bin/runme \
    --presetup /Users/sourishkrout/Projects/stateful/oss/vscode-runme/presetup.sh \
  build-extension \
    --gh-token $(gh auth token)
```
