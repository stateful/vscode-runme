# Cell configuration

To provide the best possible README (interactive markdown) experience to your users, be sure to configure your document's cells.

See the complete list of cell configuration options [in the docs](https://runme.dev/docs/configuration#all-available-options).

## `Handle long-running processes`

You want to enable the `background` setting if notebook execution will continue indefinitely on a single command.

![Readme background task status bar](https://github.com/stateful/runme.dev/raw/63f857ba8f4f8cfd824099c80c14ffc405802ea4/static/img/long-running-process.png)

It is very common to use file-watcher enabled compilers/bundlers (`npm start dev`, `watchexec`... etc) in the background during development. For any cell containing an instance of these commands be sure to tick the `"background"` cell setting. It prevents execution from permanently blocking the notebook UX. Once ticked notice the "Background Task" label shows up in the cell status bar.

![Readme background task status bar](https://github.com/stateful/runme.dev/raw/63f857ba8f4f8cfd824099c80c14ffc405802ea4/static/img/background-task-process.png)

**Default:** `false`
**Example:**

    ```sh { background=true }
    npm run watch
    ```

## `Interactive` vs `non-interactive` cells

If a cell's commands do not require any input from a reader it might be a good fit to include the cell's output inside the notebook. This is useful if the resulting output could be useful as input in a downstream cell. This is what `interactive=false` is for which defaults to true.

![Readme interactive task status bar](https://github.com/stateful/runme.dev/raw/63f857ba8f4f8cfd824099c80c14ffc405802ea4/static/img/interactive-execution.png)

**Default:** `true`
**Example:**

    ```sh { interactive=false }
    openssl rand -base64 32
    ```
Please note that the Runme team is currently working on making output in both notebook & terminal default behavior.

## Terminal visibility post-execution

A cell's execution terminal is auto-hidden unless it fails. This default behavior can be overwritten if keeping the terminal open is in the interest of the Runme notebook reader. Just untick `closeTerminalOnSuccess (false)`.

**Default:** `true`
**Example:**

    ```sh { closeTerminalOnSuccess=false }
    docker ps | grep runme/demo:latest
    ```

Check the docs on [runme.dev](https://runme.dev/docs/annotations) for more

## Human-friendly output

JSON, text, images, etc. Not all cells’ output is plain text. Using the `mimeType` specifier it is possible to specify the expected output's type. Notebooks have a variety of renderers that will display them human friendly. The MIME type defaults to text/plain.

![Readme mimeType task status bar](https://github.com/stateful/runme.dev/raw/63f857ba8f4f8cfd824099c80c14ffc405802ea4/static/img/human-centric-output.png)


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
