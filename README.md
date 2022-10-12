# [Runme](http://runme.dev) for [Visual Studio Code](https://code.visualstudio.com/)

This VS Code extension transparently opens markdown files (i.e. README.md) as runnable VS Code notebooks (with the click of a `play` button). Annotating markdown code blocks repo maintainers can enhance the interactive runbook-like experience of their markdown notebooks while they will continue to render properly in markdown viewers.

![Text and notebook view side-by-side](https://staging.runme.dev/sidebyside.png)

This project is open source licensed under APL2.0 and its code can be found in the following repos:

- [stateful/vscode-runme](https://github.com/stateful/vscode-runme)
- [stateful/runme](https://github.com/stateful/runme)
- [stateful/runme.dev](https://github.com/stateful/runme.dev)

Feel free to submit any issues you may have via the
[issue tracker](https://github.com/stateful/vscode-runme/issues) or [tell us about it on Discord](https://discord.gg/BQm8zRCBUY).

# Installation

- Install from the [VS Code marketplace website](https://marketplace.visualstudio.com/items?itemName=stateful.runme)
- Search for `runme` in the VS Code marketplace or extensions panel
- Be on the cutting edge and [download the latest release](https://github.com/stateful/vscode-runme/releases)

# Usage

After cloning into a repo in VS Code, open any markdown file and notice that instead of opening the markdown file content, in renders a notebook where shell commands are rendered as runnable blocks.

If you don't want the runme notebook, you can always right click on the .md file, click `Open With...` and select the text editor.

## Elevated Notebook Experience

Code blocks with `sh` or `bash` designators will result in executable notebook cells.

<pre>```sh
ls -al #some executable command here
```
</pre>

Auto-detection for will be applied to blocks without language designators. We do however recommend to add language designators to all code blocks.

<pre>```
echo "block without language designation"
```
</pre>

Run in the background, great for compilers/bundler with file watchers.

<pre>```sh { background=true }
ls -al #some executable command here
```
</pre>

Notebook cells will launch a task inside of the terminal panel by default to allow for user-input. However, if code blocks do not require user interactivity it is possible to run them inline.

<pre>```sh { interactive=false }
ls -al #some executable command here
```
</pre>

Environment variables which are unbound (i.e. need user input) will prompt users for input. Quoted values will be prepopulated as placeholder value whereas unquoted values will be displayed as prompt message with empty value.

<pre>
```sh { interactive=false }
echo "Allows to make execution generic"
export PATH="$HOME/your/bin:$PATH"
export MY_PROJECT_PROMPT=Enter project name
export MY_PROJECT_VALUE="my-project-id"
echo $MY_PROJECT_PROMPT $MY_PROJECT_VALUE
```
</pre>

Please see [runme.dev's README.md](https://github.com/stateful/runme.dev/blob/main/README.md) for a reference how to apply these attributes in different use-cases.

## Service integrations

I don't know how this works, is it automatic? Do you have to be authed?

## How it works

The runme parser is written in GoLang and compiled to WASM allowing it be used to parse the AST of markdown files from within VS Code. This way the CLI experience and VS Code experience should track pretty closely as improvements are made. Within VS Code the parsed markdown is then displayed in a notebook using a custom render.

## Alpha software

This is alpha software that is under heavy development, we appreciate your patience and involvement as we work to make it great.

- [Join our Discord](https://discord.gg/BQm8zRCBUY)
- [Submit an Issue](https://github.com/stateful/vscode-runme/issues)
- [Contribute on Github](https://github.com/stateful/vscode-runme/blob/main/CONTRIBUTING.md)
