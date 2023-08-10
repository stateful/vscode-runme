# Cell configuration

To provide the best possible README (interactive markdown) experience to your users, be sure to configure your document's cells.

See the complete list of cell configuration options [in the docs](https://docs.runme.dev/configuration#cell-level-options).

## `Handle long-running processes`

You want to enable the `background` setting if notebook execution will continue indefinitely on a single command.

![Readme background task status bar](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/long-running-process.png?raw=true)

It is very common to use file-watcher enabled compilers/bundlers (`npm start dev`, `watchexec`... etc) in the background during development. For any cell containing an instance of these commands be sure to tick the `"background"` cell setting. It prevents execution from permanently blocking the notebook UX. Once ticked notice the "Background Task" label shows up in the cell status bar.

![Readme background task status bar](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/background-task-process.png?raw=true)

**Default:** `false`<br />
**Example:**

    ```sh { background=true }
    npm run watch
    ```

## `Interactive` vs `non-interactive` cells

If a cell's commands do not require any input from a reader it might be a good fit to include the cell's output inside the notebook. This is useful if the resulting output could be useful as input in a downstream cell. This is what `interactive=false` is for which defaults to true.

![Readme interactive task status bar](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/interactive-execution.png?raw=true)

**Default:** `true`<br />
**Example:**

    ```sh { interactive=false }
    openssl rand -base64 32
    ```
Please note that the Runme team is currently working on making output in both notebook & terminal default behavior.

## Terminal visibility post-execution

A cell's execution terminal is auto-hidden unless it fails. This default behavior can be overwritten if keeping the terminal open is in the interest of the Runme notebook reader. Just untick `closeTerminalOnSuccess (false)`.

**Default:** `true`<br />
**Example:**

    ```sh { closeTerminalOnSuccess=false }
    docker ps | grep runme/demo:latest
    ```

Check the docs on [runme.dev](https://runme.dev/docs/annotations) for more

## Human-friendly output

JSON, text, images, etc. Not all cells’ output is plain text. Using the `mimeType` specifier it is possible to specify the expected output's type. Notebooks have a variety of renderers that will display them human friendly. The MIME type defaults to text/plain.

![Readme mimeType task status bar](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/human-centric-output.png?raw=true)

## Exclude Cell from Run All

Every VS Code notebook allows to run all available cells. This can be useful if you define a complete runbook in your markdown file and it allows developers to just click the "Run All" button to get set-up and running. However sometimes certain cells should be excluded from this workflow. With the `excludeFromRunAll` option you can configure this behavior.

**Default:** `false`<br />
**Example:**

    ```sh { excludeFromRunAll=true }
    # Do something optional here
    ```

## Run All Cells by Category

If you have multiple workflows in a single markdown file you can categorize them and allow your developers to run all cells by a certain category. To enable that you can add a category as cell option. A cell can have one or multiple categories that are comma seperated.

**Default:** `""`<br />
**Example:**

    ```sh { category=build }
    # Do something here
    ```

    ```sh { category=build,deployment }
    # Do something here
    ```

![Run by category](https://github.com/stateful/docs.runme.dev/blob/2518b5a70ccf586b671712027e4e1d74fbdc0750/static/img/categories.gif?raw=true)

## Supported MIME types

Runme supports the standard VS Code MIME types alongside custom Runme MIME types.

### Standard VS Code MIME types

- text/plain
- application/javascript
- text/html
- image/svg+xml
- text/markdown
- image/png
- image/jpeg

### MIME types for rendering code

- text/x-json
- text/x-javascript
- text/x-html
- text/x-rust
- text/x-LANGUAGE_ID for any other built-in or installed languages.
