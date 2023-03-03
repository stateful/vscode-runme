# [Runme](http://runme.dev) for [Visual Studio Code](https://code.visualstudio.com/) [![Tests](https://github.com/stateful/vscode-runme/actions/workflows/test.yml/badge.svg)](https://github.com/stateful/vscode-runme/actions/workflows/test.yml)

This VS Code extension transparently opens markdown files (i.e. README.md) as runnable VS Code notebooks (with the click of a `play` button). Annotating markdown code blocks repo maintainers can enhance the interactive runbook-like experience of their markdown notebooks while they will continue to render properly in markdown viewers.

> 💡 If you don't want the runme notebook, you can always right click on the .md file, click `Open With...` and select the text editor. To make your choice permanent pick "Configure default editor for...".

![Text and notebook view side-by-side](https://runme.dev/img/intro.gif)

## Documentation

Please visit Runme's documentation to learn about its purpose, all its features, and how to get the most out of it:

- [https://runme.dev/docs/intro](https://runme.dev/docs/intro)

This project is open source licensed under APL2.0 and its code can be found in the following repos:

- [stateful/vscode-runme](https://github.com/stateful/vscode-runme)
- [stateful/runme](https://github.com/stateful/runme)
- [stateful/runme.dev](https://github.com/stateful/runme.dev)

Feel free to submit any issues you may have via the
[issue tracker](https://github.com/stateful/vscode-runme/issues) or [tell us about it on Discord](https://discord.gg/stateful).

# Installation

- Search for `runme` in the VS Code marketplace or extensions panel
- Install from the [VS Code marketplace website](https://marketplace.visualstudio.com/items?itemName=stateful.runme)
- Be on the cutting edge and [download the latest release](https://github.com/stateful/vscode-runme/releases)

# Usage

After cloning into a repo in VS Code, open any markdown file and notice that instead of opening the markdown file content, in renders a notebook where shell commands are rendered as runnable blocks. Please see Runme's [Getting Started guide](https://runme.dev/docs/getting-started) for step-by-step instructions.

> If you don't want the runme notebook, you can always right click on the .md file, click `Open With...` and select the text editor. To make your choice permanent pick "Configure default editor for...".

## Configure Cell Execution

Runme allows code blocks to be annotated with attributes to provide control over some aspects of execution, output, interaction, and other behavior. Please find a complete list in the [docs](https://runme.dev/docs/configuration).

For instance, the following annotation will run the command in the background, great for compilers/bundler with file watchers. To enable or disable any of the available options just click the respective cell's `Configure` button.

    ```sh { background=true }
    npx tsc --watch
    ```

Check the complete list of configuration options at https://runme.dev/docs/configuration or take a look at the [examples](https://github.com/stateful/vscode-runme/tree/main/examples) which are also illustrated in [Runme's integration docs](https://runme.dev/docs/integrations).

## How It Works

Runme currently consists of a Markdown server (written in Go) which is connected to VS Code extension (via GRPC; optionally WebAssembly being deprecated) and the [runme CLI](https://github.com/stateful/runme) (Go binary) allowing for a consistent experience. The Runme VS Code extension leverages the notebook APIs to transparently provide an interactive user experience on top of static markdown files, such as README.md.

## Beta Software

Runme is in rapid development. Checkout our roadmap at [https://github.com/stateful/runme/projects](https://github.com/stateful/runme/projects). Please be aware of following known limitations:

- Only shell is currently supported on macOS, Linux, and limited support on Windows. PowerShell is not supported yet
- Be aware of edge cases. Runme still needs to continue maturing. Let us know when you hit any snags. We appreciate it!

We would love to hear feedback, appreciate your patience, as Runme continutes to harden. Get in touch please!

- [Join our Discord](https://discord.gg/BQm8zRCBUY)
- [Review the Roadmap](https://github.com/stateful/runme/projects)
- [Submit an Issue](https://github.com/stateful/vscode-runme/issues)
- [Contribute on Github](https://github.com/stateful/vscode-runme/blob/main/CONTRIBUTING.md)
