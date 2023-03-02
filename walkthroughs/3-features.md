# Key features

## Run a command

To run a command, simply click the run button (may require your mouse over the command in some themes). You will notice that this turns into a stop button for hung or long-running commands, which can be used to kill the terminal process.

![Readme run a command](https://runme.dev/assets/images/run-a-command-f37f5462befc66c5721c19dfe4336352.png)

A succeeding exit code will be indicated with the small green checkbox seen below:

![Readme run a command result](https://runme.dev/assets/images/check-mark-success-d2f5bcb93690d780969dda1a3b710034.png)

You can also open the terminal that did the execution by clicking the “Open Terminal” button as shown above with its PID.


## Copy & paste

Outside of literally running commands, Runme offers the ability to quickly copy commands (with the click of a button) out of a markdown file to paste into your terminal.

![Readme run a command result](https://runme.dev/assets/images/feature-copy-d4563fd523f32ecc468254750d3aafe4.png)


## Run all commands

To run all the commands in the notebook in the order they are found, you can click the “Run All” button.

![Readme run all commands](https://runme.dev/assets/images/run-all-877ed54c3b7bd63b837c8e5a7cfd1235.png)

To be extra safe, you will be prompted before each step to confirm your intentions unless you select “Skip Prompt and run all”.

![Readme run all commands confirm step](https://runme.dev/assets/images/confirm-run-all-def58028aa9410f8abdcf9c0e79d37c9.png)

## Split view of markdown and notebook

It’s easy to get from notebook to markdown and vice versa.

### Open the notebook version

![Readme run all commands confirm step](https://runme.dev/assets/images/split-view-ba9635ba52ccc77021f35e23da587bdb.png)

### Open the markdown version

![Readme open md version](https://runme.dev/assets/images/markdown-version-4a58ba676a1a96571a7188c643bcab6d.png)

## Summary

- Execute command blocks via a simple ️⏯ play button instead of copy&paste-ing into your terminal
- Leverage placeholder and prompts to have readers interactively complete ENV VARs
- Fine-tune your doc's executable notebook cells to streamline the execution experience for others
- Run watchers for compilation/bundling in as background tasks
- Capture non-interactive output directly inside the respective notebook's cell output
- Control whether or not a cell's terminal should remain open after successful execution
- Use language identifiers in fenced code blocks to forgo language detection and higher reliability
- Set a cell's output MIME type to render images, JSON, or any other format in human-compatible ways