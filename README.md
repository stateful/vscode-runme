# [Runme](http://runme.dev) for [Visual Studio Code](https://code.visualstudio.com/) [![Tests](https://github.com/stateful/vscode-runme/actions/workflows/test.yml/badge.svg)](https://github.com/stateful/vscode-runme/actions/workflows/test.yml)

This VS Code extension transparently opens markdown files (i.e. README.md) as runnable VS Code notebooks (with the click of a `play` button). Annotating markdown code blocks repo maintainers can enhance the interactive runbook-like experience of their markdown notebooks while they will continue to render properly in markdown viewers.

> 💡 If you don't want the runme notebook, you can always right click on the .md file, click `Open With...` and select the text editor. To make your choice permanent pick "Configure default editor for...".

![Text and notebook view side-by-side](https://runme.dev/img/intro.gif)

This project is open source licensed under APL2.0 and its code can be found in the following repos:

- [stateful/vscode-runme](https://github.com/stateful/vscode-runme)
- [stateful/runme](https://github.com/stateful/runme)
- [stateful/runme.dev](https://github.com/stateful/runme.dev)

Feel free to submit any issues you may have via the
[issue tracker](https://github.com/stateful/vscode-runme/issues) or [tell us about it on Discord](https://discord.gg/stateful).

# Installation

- Install from the [VS Code marketplace website](https://marketplace.visualstudio.com/items?itemName=stateful.runme)
- Search for `runme` in the VS Code marketplace or extensions panel
- Be on the cutting edge and [download the latest release](https://github.com/stateful/vscode-runme/releases)

# Usage

After cloning into a repo in VS Code, open any markdown file and notice that instead of opening the markdown file content, in renders a notebook where shell commands are rendered as runnable blocks.

If you don't want the runme notebook, you can always right click on the .md file, click `Open With...` and select the text editor. To make your choice permanent pick "Configure default editor for...".

## Elevated Notebook Experience

Runme allows code blocks to be annotated with attributes to provide control over some aspects of execution, output, interaction, and other behavior. Please find a complete list in the [docs](https://runme.dev/docs/intro).

For instance, the following annotation will run the command in the background, great for compilers/bundler with file watchers.

    ```sh { background=true }
    npx tsc --watch
    ```

Check the complete list at https://runme.dev/docs/annotations or take a look at the [examples](https://github.com/stateful/vscode-runme/tree/main/examples) available inside the VS Code extension repo for a reference how to apply these code block attributes in different use-cases.

## Interactive Service integrations

Runme strives to break out of the terminal without losing interoperability with the CLI to document how the your repo ties together an array for external services. To showcase how this works take a look at the GIF below or run through [Runme.dev's website README](https://github.com/stateful/runme.dev/blob/main/README.md).

![Deep Deno integration](https://runme.dev/img/tabs/deno.gif)

What's happening is whenever Deno's `deployctl deploy` command is executed to deploy a Deno site from within a notebook cell (just a markdown code block), Runme will render an interactive deployment status based on the `$DENO_PROJECT_NAME` and `$DENO_ACCESS_TOKEN` provided in the notebook (will prompt for values otherwise).

```sh
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
export DENO_PROJECT_NAME="your-deno-project"
export DENO_ACCESS_TOKEN="your-deno-token"
```

```sh
cd ../runme.dev
deployctl deploy \
    --project=$DENO_PROJECT_NAME \
    --exclude=node_modules \
    --import-map=../runme.dev/import_map.json \
    --token=$DENO_ACCESS_TOKEN \
    main.ts
```

Let us know what other services you rely on.

## How It Works

Runme currently consists of a Markdown processor (written in Go) which is both linked in this VS Code extension (via WebAssembly) and the [runme CLI](https://github.com/stateful/runme) (Go binary) allowing for a consistent experience. The Runme VS Code extension leverages the notebook APIs to transparently provide an interactive user experience on top of static markdown.

## Beta Software

Runme is in rapid development. Checkout our roadmap at [https://github.com/stateful/runme/projects](https://github.com/stateful/runme/projects). Please be aware of following known limitations:

- Notebook editing requires your markdown to be git-tracked (unless disabled in config) to avoid accidents
- Only shell is currently supported on macOS, Linux, and limited support on Windows. PowerShell is not supported yet
- Be aware of edge cases. Runme still needs to continue maturing. Let us know when you hit a snags. We appreciate it!

We would love to hear feedback, appreciate your patience, as Runme continutes to harden. Get in touch please!

- [Join our Discord](https://discord.gg/BQm8zRCBUY)
- [Review the Roadmap](https://github.com/stateful/runme/projects)
- [Submit an Issue](https://github.com/stateful/vscode-runme/issues)
- [Contribute on Github](https://github.com/stateful/vscode-runme/blob/main/CONTRIBUTING.md)
