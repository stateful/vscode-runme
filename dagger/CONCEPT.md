---
cwd: ..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
---

```sh {"id":"01HXF9X7750APY0DB81KPPZBN5","terminalRows":"5"}
export PROGRESS_OUTPUT="plain"
echo "Using $PROGRESS_OUTPUT for progress logging"
```

```sh {"id":"01HTNVRK3AJ2AT8M24TA996RCJ","terminalRows":"15"}
dagger -m vscode-runme functions
```

## Composition via References

> 🚨 Warning, unlike [README.md](README.md) this won't actually run since it's merely conceptual.

Instead of either coupling the two pipeline steps inside the module code or combining them in one gigantic `dagger call` I'd like to be able to store a reference ID in `KERNEL_BINARY`:

```sh {"id":"01HTQBSZTS5M1HP3GGP4T99PT0","name":"KERNEL_BINARY","terminalRows":"28"}
dagger call --progress $PROGRESS_OUTPUT \
  -m golang \
  --src ../runme \
  build \
  cache-id
```

And, the use it in the `dagger call` to compose the two steps. Like so:

```sh {"id":"01HTNZBARHB97RPQPCVQZ7PNRN","name":"EXTENSION_VSIX","terminalRows":"25"}
dagger --progress $PROGRESS_OUTPUT \
  call \
  with-remote \
    --remote "github.com/runmedev/vscode-runme" \
    --ref "main" \
  with-container \
    --binary $KERNEL_BINARY \
    --presetup dagger/scripts/presetup.sh \
  build-extension \
    --gh-token $(gh auth token)
```

Instead of explicitly requesting a cache-id, the underlying notebook kernel could grab the ID from stderr vs stdout or do a follow-up call to a separate API to remove "clutter" from the CLI call.
