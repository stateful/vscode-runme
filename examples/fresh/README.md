---
runme:
  id: 01HF7B0KJX64XJR1HW3PDMFPZ0
  version: v2.0
---

# Fresh

This project is a showcase for deploying apps with Deno and [Runme Extension](https://marketplace.visualstudio.com/items?itemName=stateful.runme).

## Prerequisites

This project is based on [Fresh](https://fresh.deno.dev/) and requires Deno to
run.

You can test if you already have deno installed by running the following command:

```sh {"closeTerminalOnSuccess":"false","id":"01HF7B0KJX64XJR1HW31ZWFYMK","interactive":"false"}
deno --version
```

To update a previously installed version of Deno, run:

```sh {"id":"01HF7B0KJX64XJR1HW323R0KBD"}
deno upgrade
```

To install Deno via homebrew on macOS:

```sh {"id":"01HF7B0KJX64XJR1HW3516T0RA"}
# macOS
brew bundle --no-lock
```

Or the installer which also works on Linux:

```sh {"id":"01HF7B0KJX64XJR1HW38G7MJXA"}
# macOS or Linux
curl -fsSL https://deno.land/x/install/install.sh | sh
```

Once Deno is installed, ensure is added to your path:

```sh {"id":"01HF7B0KJX64XJR1HW3AM7VV7D"}
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
```

### Development

Start the project:

```sh {"background":"true","id":"01HF7B0KJX64XJR1HW3BYK8SZE"}
deno task start
```

Open the project in your browser:

```sh {"id":"01HF7B0KJX64XJR1HW3F9FC7H0","interactive":"false"}
open http://localhost:8000/
```

This will watch the project directory and restart as necessary.

### Deployment

We will be using [Deno deploy](https://deno.com/deploy) a serverless edge first JavaScript hosting service.

To deploy this project you need to have `deployctl` (the command line tool for Deno Deploy) installed on your system. To
install, please run:

```sh {"closeTerminalOnSuccess":"false","id":"01HF7B0KJX64XJR1HW3HHTQDS9","interactive":"false"}
deno install \
  --allow-read --allow-write \
  --allow-env --allow-net --allow-run \
  --no-check \
  -r -f https://deno.land/x/deploy/deployctl.ts
```

Once installed successfully, create a
[new access token](https://dash.deno.com/account#access-tokens) and export it
into your environment:

```sh {"id":"01HF7B0KJX64XJR1HW3KQ95EFN"}
echo "Set up your deno environment"
export DENO_PROJECT_NAME="<insert-project-name>"
export DENO_ACCESS_TOKEN="<insert-token-here>"
```

then you can run a preview deployment and subsequently promote it to production via:

```sh {"background":"true","id":"01HF7B0KJX64XJR1HW3MG37X12"}
deployctl deploy \
    --project=$DENO_PROJECT_NAME \
    --exclude=node_modules \
    --import-map=import_map.json \
    --token=$DENO_ACCESS_TOKEN \
    main.ts
```
