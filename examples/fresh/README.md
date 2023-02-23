# Fresh

This project is a showcase for deploying apps with Deno and [Runme Extension](https://marketplace.visualstudio.com/items?itemName=stateful.runme).

## Prerequisites

This project is based on [Fresh](https://fresh.deno.dev/) and requires Deno to
run.

To test if you already have Deno installed run:
If this prints the Deno version to the console the installation was successful.

```sh { closeTerminalOnSuccess=false interactive=false }
  deno --version
```

To update a previously installed version of Deno, run:

```sh
deno upgrade
```

To install Deno via homebrew on macOS:

```sh
# macOS
brew bundle --no-lock
```

Or the installer which also works on Linux:

```sh
# macOS or Linux
curl -fsSL https://deno.land/x/install/install.sh | sh
```

Add Deno to your path:

```sh
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
```

### Development

Start the project:

```sh { background=true }
deno task start
```

Open the project in your browser:

```sh { interactive=false }
open http://localhost:8000/
```

This will watch the project directory and restart as necessary.

### Deployment

To deploy this project you need to have `deployctl` installed on your system. To
install, please run:

```sh { closeTerminalOnSuccess=false interactive=false }
deno install \
  --allow-read --allow-write \
  --allow-env --allow-net --allow-run \
  --no-check \
  -r -f https://deno.land/x/deploy/deployctl.ts
```

Once installed successfully, create a
[new access token](https://dash.deno.com/account#access-tokens) and export it
into your environment:

```sh
echo "Set up your deno environment"
export DENO_PROJECT_NAME="<insert-project-name>"
export DENO_ACCESS_TOKEN="<insert-token-here>"
```

then you can run a preview deployment and subsequently promote it to production via:

```sh { background=true }
deployctl deploy \
    --project=$DENO_PROJECT_NAME \
    --exclude=node_modules \
    --import-map=import_map.json \
    --token=$DENO_ACCESS_TOKEN \
    main.ts
```
