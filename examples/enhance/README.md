# Enhance

This project is a showcase for deploying apps with Begin and [Runme Extension](https://marketplace.visualstudio.com/items?itemName=stateful.runme).

## Prerequisites

This project is based on the HTML-first [Enhance](https://enhance.dev/) framework run. It requires [Node.js](https://nodejs.org/en/download) to be installed on your machine.

Before you start make sure to install the dependencies of the project:

```sh
npm install
```

### Development

Start the project:

```sh { background=true }
npm start
```

Open the project in your browser:

```sh { interactive=false }
open http://localhost:3333/
```

This will watch the project directory and restart as necessary.

### Deployment

To deploy this project you need to have `begin` CLI installed on your system. To
install, please run:

```sh { closeTerminalOnSuccess=false interactive=false }
curl -sS https://dl.begin.com/install.sh | sh
```

Ensure you have the CLI installed:

```sh
begin version
```

If not, ensure that the CLI was added your `$PATH`:

```sh
export BEGIN_INSTALL="$HOME/.begin"
export PATH="$BEGIN_INSTALL:$PATH"
```

Once installed successfully, you can log into your Begin account via:

```sh
begin login
```

If you haven't deployed the application before, create one first via:

```sh
begin create
```

The Begin CLI will store a new `appId` in your `.arc` file. Then you can run a deployment via:

```sh { background=true }
begin deploy
```

In order to review the status of the deployment you can run:

```sh
begin deploy --status
```
