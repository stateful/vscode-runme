Runme Examples
==============

This `README.md` contains some examples for testing this extension.

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Shell Executions

```sh
echo "Hello World!"
```
## More Shell

```sh { interactive=false }
echo "Foo 👀"
sleep 2
echo "Bar 🕺"
sleep 2
echo "Loo 🚀"
```

## Background Task Example

```sh { background=true }
sleep 100000
```

## Complex Output

```sh
yarn global add webdriverio
```

## Stdin Example

```
node ./scripts/stdin.js
```

## Script Example

You can also run TypeScript or JavaScript:

```js
document.body.innerHTML += 'script attached!'
```

## Environment Variables

Within single lines:

```sh
export DENO_ACCESS_TOKEN="<insert-token-here>"
```

verify:

```sh { interactive=false }
echo "DENO_ACCESS_TOKEN: $DENO_ACCESS_TOKEN"
```

Supports multiple lines where the export is just somewhere in between:

```sh
echo "Auth token for service foo"
export SERVICE_FOO_TOKEN=foobar
echo "Auth token for service bar"
export SERVICE_BAR_TOKEN="barfoo"
```

verify:

```sh { interactive=false }
echo "SERVICE_FOO_TOKEN: $SERVICE_FOO_TOKEN"
echo "SERVICE_BAR_TOKEN: $SERVICE_BAR_TOKEN"
```

Supports changes to `$PATH`:

```sh { interactive=false }
export PATH="/some/path:$PATH"
echo $PATH
```

Supports piping content into an environment variable:

```sh
export LICENSE=$(cat ../LICENSE)
```

verify:

```sh { interactive=false }
echo "LICENSE: $LICENSE"
```

Support multiline exports:

```
export PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA04up8hoqzS1+
...
l48DlnUtMdMrWvBlRFPzU+hU9wDhb3F0CATQdvYo2mhzyUs8B1ZSQz2Vy==
-----END RSA PRIVATE KEY-----"
```

verify:

```sh { interactive=false }
echo "PRIVATE_KEY: $PRIVATE_KEY"
```

## Copy From Result Cell

You can copy also results from the inline executed shell:

```sh { interactive=false }
openssl rand -base64 32
```

## Non-Supported Languages

These are shown as simple markdown, e.g:

```py { readonly=true }
    print("Hello World")
```

## PyEnv

Given you have `pyenv` installed, running:

```sh
python --version
```

prints `Python 3.8.12`, to update call

```sh
pyenv install 3.10.0
```

Now when calling

```sh
pyenv global 3.11-dev
python --version
```

will print `Python 3.11.0+`

## NVM

Given you have `nvm` installed, expose it to the Shell session via:

```sh
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

and your current Node.js version:

```sh
node --version
```

is `v18.11.0`, when you switch to a different version:

```sh
nvm install 19
```

it should have switched there as

```sh
node --version
```

returns `v19.0.0`
