---
sidebar_position: 1
title: Examples
---

# Runme Examples

This `README.md` contains some examples for testing this extension.

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Shell Executions

```sh { background=false interactive=true }
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
$ npm i -g webdriverio
```

## Stdin Example

```sh
node ./scripts/stdin.js
```

## Formatted Code Blocks

You can also inline TypeScript or JavaScript:

```js
function attach() {
    document.body.innerHTML += 'Hello world!'
}
```

## Environment Variables

Within single lines:

```sh
$ export DENO_ACCESS_TOKEN="<insert-token-here>"
```

verify:

```sh { interactive=false }
echo "DENO_ACCESS_TOKEN: $DENO_ACCESS_TOKEN"
```

Supports multiple lines where the export is just somewhere in between:

```sh
echo "Auth token for service foo"
export SERVICE_FOO_TOKEN="foobar"
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

```sh
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

These are shown as simple markdowns, e.g:

```py { readonly=true }
def hello():
    print("Hello World")
```

## Curl an image

```sh { interactive=false, mimeType=image/png }
curl -s https://lever-client-logos.s3.us-west-2.amazonaws.com/a8ff9b1f-f313-4632-b90f-1f7ae7ee807f-1638388150933.png
```

## Terminal Dimensions

```sh { background=true closeTerminalOnSuccess=false }
watch -n 0.1 "
echo Rows: \$(tput lines)
echo Columns: \$(tput cols)
"
```

## Inspect JSON files

With [`antonmedv/fx`](https://github.com/antonmedv/fx) you can inspect JSON files interactively in Runme notebooks, e.g.:

```sh { terminalRows=20 }
curl -s "https://api.marquee.activecove.com/getWeather?lat=52&lon=10" | fx
```

## YAML

```yaml
config:
  nested:
    para: true
```

## JavaScript

```sh
export YOUR_NAME=enter your name
```

```javascript { name=echo-hello-js }
console.log(`Hello, ${process.env.YOUR_NAME}!`)
```
