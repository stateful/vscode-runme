---
runme:
  id: 01HF7B0KJZGJFJ7P0G9MAQCSM4
  version: v3
---

## ⛔️  This feature is deprecated

This feature will no longer receive updates, bug fixes, or support from our team.

If you have feedback / questions [Join our Community](https://runme.dev/community)

# Enhance

This project is a showcase for deploying apps with [Begin](https://begin.com/) and [Runme Extension](https://marketplace.visualstudio.com/items?itemName=stateful.runme).
Begin is an end-to-end platform for building fullstack web apps that are highly stable, easily maintainable, yet extremely fast and full-featured.

## Prerequisites

This project is based on the HTML-first [Enhance](https://enhance.dev/) framework run. It requires [Node.js](https://nodejs.org/en/download) to be installed on your machine.
Enhance is an HTML-first full-stack web framework that gives you everything you need to build standards-based multi-page web apps that perform and scale.

Before you start make sure to install the dependencies of the project:

```sh {"id":"01HF7B0KJZGJFJ7P0G8S5RSEM7"}
npm install
```

### Development

Start the project:

```sh {"background":"true","id":"01HF7B0KJZGJFJ7P0G8VDRF7HP"}
npm start
```

Open the project in your browser:

```sh {"id":"01HF7B0KJZGJFJ7P0G8Y5KNFZ1","interactive":"false"}
open http://localhost:3333/
```

This will watch the project directory and restart as necessary.

### Deployment

To deploy the `begin` project example you need to have `begin` CLI installed on your system. To
install, please run:

```sh {"closeTerminalOnSuccess":"false","id":"01HF7B0KJZGJFJ7P0G91HRZB7V","interactive":"false"}
curl -sS https://dl.begin.com/install.sh | sh
```

To check you have `begin` CLI installed, you can run the following command:

```sh {"id":"01HF7B0KJZGJFJ7P0G93127C4D"}
begin version
```

If you have `begin` CLI installed, but still not working, ensure that the CLI was added your `$PATH`:

```sh {"id":"01HF7B0KJZGJFJ7P0G95FKSDNC"}
export BEGIN_INSTALL="$HOME/.begin"
export PATH="$BEGIN_INSTALL:$PATH"
```

To get started with Begin, once you have `begin` CLI installed and configured, you can log into your Begin account via:

```sh {"id":"01HF7B0KJZGJFJ7P0G98XACPWA"}
begin login
```

If you haven't deployed the application before, create one first via:

```sh {"id":"01HF7B0KJZGJFJ7P0G9BBD4J4K"}
begin create
```

The Begin CLI will store a new `appId` in your `.arc` file. Then you can run a deployment via:

```sh {"background":"true","id":"01HF7B0KJZGJFJ7P0G9F2E6QD1"}
begin deploy
```

In order to review the status of the deployment you can run:

```sh {"id":"01HF7B0KJZGJFJ7P0G9GE4N06S"}
begin deploy --status
```
