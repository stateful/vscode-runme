# Code Block Annotations

Runme supports a variety of code block annotations that allows to modify the behavior of the cell and how it is being executed.

See the complete list of annotations [in the docs](https://runme.dev/docs/annotations).

## `background`

Some scripts are suppose to run within the background to not disturb you from development. With the `background` annotation you can tell Runme to have this command run as background task and don't have it pop-up a terminal.

**Default:** `false`
**Example:**

    ```sh { background=true }
    npm run watch
    ```

## `interactive`

With the interactive flag you can decide whether the stdout of the process should be printed directly within the result cell or as part of a VS Code terminal. **Note:** printing stdout within the result cell doesn't allow you to interact with the process, e.g. through `stdin` input. However it allows you to copy out the process output which is useful in many situations to continue with your dev-ops process.

**Default:** `true`
**Example:**

    ```sh { interactive=false }
    openssl rand -base64 32
    ```

## `closeTerminalOnSuccess`

If your execute a command within a VS Code terminal window you can have it stick around even after successful execution using the `closeTerminalOnSuccess` flag.

**Default:** `true`
**Example:**

    ```sh { closeTerminalOnSuccess=false }
    docker ps | grep runme/demo:latest
    ```

Check the docs on [runme.dev](https://runme.dev/docs/annotations) for more
