---
cwd: ..
runme:
  id: 01HTNVRGFMWZERW6S2CZZ9E990
  version: v3
---

# Express Dagger Pipelines in Notebooks

One function's output is being used as another function's input. This is a common pattern to compose pipelines.

In this notebook, we will explore how to express such pipelines using Dagger inside a literal notebook environment. As an example, we build and bundle this VS Code extension.

> 💡 This demo is using a "slightly" modified version of the dagger binary based on https://github.com/dagger/dagger/pull/7479.

### Build the Kernel Binary

Let's use [github.com/purpleclay/daggerverse](https://daggerverse.dev/mod/github.com/purpleclay/daggerverse/golang) to build the kernel binary.

```sh {"id":"01J04HR247XE1TK2MVB9SR4W51","name":"KERNEL_BINARY"}
dagger call --progress=$PROGRESS \
  -m golang \
  --src ../runme \
  build \
  file \
    --path runme
```

### Grab the Presetup Script

We don't want to maintain a build container. Let's grab the script used to provision it on the fly.

```sh {"id":"01J04N5MHBFHPQQZ0HDGVQVC70","name":"PRESETUP"}
dagger call --progress=$PROGRESS \
  get-repo-file \
    --repo "https://github.com/stateful/vscode-runme#seb/dagger-integr" \
    --path dagger/scripts/presetup.sh
```

### Build the Extension

Putting everything together, we build the extension. While we're issuing a query here, we really want to do this with the `dagger` CLI via `dagger call`.

This call will currently fail because passing IDs from a module appears to bypass caching. However, we hear this is on Dagger's roadmap.

```sh {"id":"01J04KG1K4S8ZND9RYXKFVP4GK"}
dagger --progress=$PROGRESS query <<EOF
{
  vscodeRunme {
    withRemote(remote: "github.com/stateful/vscode-runme", ref: "main") {
      withContainer(
        binary: "$DAGGER_ID_KERNEL_BINARY"
        presetup: "$DAGGER_ID_PRESETUP"
      ) {
        buildExtension(githubToken: "$GITHUB_TOKEN") {
          export(path: "dagger/extension.xsix")
        }
      }
    }
  }
}
EOF
```

This is the error we're seeing:

<pre>🚨 17: ! failed to load ref for blob snapshot: missing descriptor handlers for lazy blobs [sha256:74eed75e10a8e6dceef2b446cf20daed65774c11cc827ec80b41c7f476c819af]</pre>

## What it could look like...

> 💡 This won't actually run.... yet.

Essentially, above's query would run this module, however, using the CLI without relying on the host filesystem.

```sh {"excludeFromRunAll":"true","id":"01J04HR247XE1TK2MVBBPV7ZM7","name":"EXTENSION_VSIX"}
dagger call --progress=$PROGRESS \
  with-remote \
    --remote "github.com/stateful/vscode-runme" \
    --ref "seb/dagger-integr" \
  with-container \
    --binary $DAGGER_ID_KERNEL_BINARY \
    --presetup $DAGGER_ID_PRESETUP \
  with-github-token \
    --token $DAGGER_ID_TOKEN \
  build-extension
```

Even above's module's output could become another function/pipeline's input.

```sh {"id":"01J094XAEPWN0JM13BFT9VVVB3","interactive":"false"}
curl -s "https://runme.dev/img/thankyou.png"
```
