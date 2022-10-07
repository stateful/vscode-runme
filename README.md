# [Runme](http://runme.dev) for [Visual Studio Code](https://code.visualstudio.com/)


This plugin enables markdown files (i.e. README.MD) to open as runnable VS Code notebooks (with the click of a `play` button). Using a superset of markdown repo maintainers can enhance the interactive runbook like experience of their markdown files without causing problems for non-runme users.

![](https://staging.runme.dev/sidebyside.png?__frsh_c=ar1160xmgpn0)

This project is open source and the code can be found in the following repos:

- [stateful/vscode-runme](https://github.com/stateful/vscode-runme)
- [stateful/runme](https://github.com/stateful/runme)
- [stateful/runme.com](https://github.com/stateful/runme.com)

Feel free to submit any issues you may have via the
[issue tracker](https://github.com/stateful/vscode-runme/issues).

## Installation

- Install from the [VS Code marketplace website](https://marketplace.visualstudio.com/items?itemName=stateful.runme)
- Search for `runme` in the VS Code marketplace or extensions panel
- Be on the cutting edge and [download the latest release](https://github.com/stateful/vscode-runme/releases)

## Usage

After cloning into a repo in VS Code, open any markdown file and notice that instead of opening the markdown file content, in renders a notebook where shell commands are rendered as runnable blocks.

If you don't want the runme notebook, you can always right click on the .md file, click `open with` and select the text editor.

## Extend your readme.md

Basic runnable block:

<pre>```sh
ls -al #some executable command here
```
</pre>

Run in the background:

<pre>```sh { background=true } 
ls -al #some executable command here
```
</pre>

Configure interactivity:
<pre>```sh { interactive=false } 
ls -al #some executable command here
```
</pre>

Path related stuff here? Or persistence? Or open terminal?

## Service integrations

I don't know how this works, is it automatic? Do you have to be authed?

## How it works

The runme parser is written in GoLang and compiled to WASM allowing it be used to parse the AST of markdown files from within VS Code. This way the CLI experience and VS Code experience should track pretty closely as improvements are made. Within VS Code the parsed markdown is then displayed in a notebook using a custom render.

## Alpha software

This is alpha software that is under heavy development, we appreciate your patience and involvement as we work to make it great.

- [Join our Discord](https://discord.gg/BQm8zRCBUY)
- [Submit an Issue](https://github.com/stateful/vscode-runme/issues)
- [Contribute on Github](https://github.com/stateful/vscode-runme/blob/main/CONTRIBUTING.md)