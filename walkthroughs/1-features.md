---
runme:
  id: 01HF7B0KJH9FJZR3CM4C3VE08B
  version: v2.0
---

# Key features

Read all about Runme's features in the [official documentation](https://docs.runme.dev/features).

## Run a command

To run a command, simply click the run button (may require your mouse over the command in some themes). You will notice that this turns into a stop button for hung or long-running commands, which can be used to kill the terminal process.

![Readme run a command](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/run-a-command.png?raw=true)

A succeeding exit code will be indicated with the small green checkbox seen below:

![Readme run a command result](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/check-mark-success.png?raw=true)

You can also open the terminal that did the execution by clicking the “Open Terminal” button as shown above with its PID.


## Copy & paste

Outside of literally running commands, Runme offers the ability to quickly copy commands (with the click of a button) out of a markdown file to paste into your terminal.

![Readme run a command result](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/feature-copy.png?raw=true)


## Run all commands

To run all the commands in the notebook in the order they are found, you can click the “Run All” button.

![Readme run all commands](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/run-all.png?raw=true)

To be extra safe, you will be prompted before each step to confirm your intentions unless you select “Skip Prompt and run all”.

![Readme run all commands confirm step](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/confirm-run-all.png?raw=true)

## Split view of markdown and notebook

It’s easy to get from notebook to markdown and vice versa.

### Open the notebook version

![Readme run all commands confirm step](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/split-view.png?raw=true)

### Open the markdown version

![Readme open md version](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/markdown-version.png?raw=true)

## Runme Cells

### Chain Cell Output

With the `$__` parameter you can transfer the stdout result of a previous cell into your next execution:

![Readme open md version](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/last-cell-result.gif?raw=true)

## Summary

- Execute command blocks via a simple ️⏯ play button instead of copy&paste-ing into your terminal
- Leverage placeholder and prompts to have readers interactively complete ENV VARs
- Fine-tune your doc's executable notebook cells to streamline the execution experience for others
- Run watchers for compilation/bundling in as background tasks
- Capture non-interactive output directly inside the respective notebook's cell output
- Control whether or not a cell's terminal should remain open after successful execution
- Use language identifiers in fenced code blocks to forgo language detection and higher reliability
- Set a cell's output MIME type to render images, JSON, or any other format in human-compatible ways
