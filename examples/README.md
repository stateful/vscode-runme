---
runme:
  id: 01HF7B0KK32HBQ9X4AC2GPMZG5
  version: v2.0
sidebar_position: 1
title: Examples
---

# Runme Examples

This `README.md` contains examples for running automated e2e tests for this extension.

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Shell Executions

```sh {"background":"false","id":"01HF7B0KK32HBQ9X4AAD3Z5V14","interactive":"true"}
echo "Hello World!"
```

## More Shell

```sh {"id":"01HF7B0KK32HBQ9X4AAGXB2CT2","interactive":"false"}
echo "Foo 👀"
sleep 2
echo "Bar 🕺"
sleep 2
echo "Loo 🚀"
```

## Background Task Example

```sh {"background":"true","id":"01HF7B0KK32HBQ9X4AAKVEJ745"}
sleep 100000
```

## Complex Output

```sh {"id":"01HF7B0KK32HBQ9X4AAP28F8EB"}
$ npm i -g webdriverio
```

## Stdin Example

```sh {"id":"01HF7B0KK32HBQ9X4AAT0019KB"}
node ./scripts/stdin.js
```

## Mix & Match Languages

You can also execute JavaScript inline:

```js {"id":"01HF7B0KK32HBQ9X4AAW385HPB"}
(function({ message }) {
    console.log(message)
})({ message: 'Running javascript that outputs this message' })
```

Or typescript:

```typescript {"id":"01HF7B0KK32HBQ9X4AAXEVS9QR"}
function unnest({ message }: { message: string }): void {
    console.log(message)
}

unnest({ message: 'Running typescript that outputs this message' })
```

Please see more examples, including configuration languages further down.

## Environment Variables

Within single lines:

```sh {"id":"01HF7B0KK32HBQ9X4AAXYPNV60"}
$ export DENO_ACCESS_TOKEN="<insert-token-here>"
```

verify:

```sh {"id":"01HF7B0KK32HBQ9X4AAYPPBDG4","interactive":"false"}
echo "DENO_ACCESS_TOKEN: $DENO_ACCESS_TOKEN"
```

Supports multiple lines where the export is just somewhere in between:

```sh {"id":"01HF7B0KK32HBQ9X4AAZWE9DQG"}
echo "Auth token for service foo"
export SERVICE_FOO_TOKEN="foobar"
echo "Auth token for service bar"
export SERVICE_BAR_TOKEN="barfoo"
```

verify:

```sh {"id":"01HF7B0KK32HBQ9X4AB010AS08","interactive":"false"}
echo "SERVICE_FOO_TOKEN: $SERVICE_FOO_TOKEN"
echo "SERVICE_BAR_TOKEN: $SERVICE_BAR_TOKEN"
```

Supports changes to `$PATH`:

```sh {"id":"01HF7B0KK32HBQ9X4AB34NRQHK","interactive":"false"}
export PATH="/some/path:$PATH"
echo $PATH
```

Supports piping content into an environment variable:

```sh {"id":"01HF7B0KK32HBQ9X4AB6WCR4PH"}
export LICENSE=$(cat ../LICENSE)
```

verify:

```sh {"id":"01HF7B0KK32HBQ9X4AB7ZE5BAY","interactive":"false"}
echo "LICENSE: $LICENSE"
```

Support multiline exports:

```sh {"id":"01HF7B0KK32HBQ9X4ABBD8E6GF"}
export PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA04up8hoqzS1+
...
l48DlnUtMdMrWvBlRFPzU+hU9wDhb3F0CATQdvYo2mhzyUs8B1ZSQz2Vy==
-----END RSA PRIVATE KEY-----"
```

verify:

```sh {"id":"01HF7B0KK32HBQ9X4ABDRDHXVN","interactive":"false"}
echo "PRIVATE_KEY: $PRIVATE_KEY"
```

## Copy From Result Cell

You can copy also results from the inline executed shell:

```sh {"id":"01HF7B0KK32HBQ9X4ABF4VNRVT","interactive":"false"}
openssl rand -base64 32
```

## Non-Shell Languages

These are sometimes executable by default, like for python:

```py {"id":"01HF7B0KK32HBQ9X4ABK1BJH8Z"}
print("Hello World")
```

Otherwise, execution can be set with the `interpreter` annotation, like so:

```yaml {"id":"01HF7B0KK32HBQ9X4ABPX5WTJ7","interpreter":"cat"}
config:
  nested:
    para: true
```

Non-shell scripts can also access environment variables, and are run from the current working directory:

```sh {"id":"01HF7B0KK32HBQ9X4ABQF4TSTW","interactive":"false"}
export YOUR_NAME=enter your name
```

```javascript {"id":"01HF7B0KK32HBQ9X4ABV1X0EHY","name":"echo-hello-js"}
console.log(`Hello, ${process.env.YOUR_NAME}, from ${__dirname}!`)
```

## Curl an image

```sh {"id":"01HF7B0KK32HBQ9X4ABWJPGK6P","interactive":"false,","mimeType":"image/png"}
curl -s https://lever-client-logos.s3.us-west-2.amazonaws.com/a8ff9b1f-f313-4632-b90f-1f7ae7ee807f-1638388150933.png
```

## Terminal Dimensions

```sh {"background":"true","closeTerminalOnSuccess":"false","id":"01HF7B0KK32HBQ9X4ABZ04Z7V1"}
watch -n 0.1 "
echo Rows: \$(tput lines)
echo Columns: \$(tput cols)
"
```

## Inspect JSON files

With [`antonmedv/fx`](https://github.com/antonmedv/fx) you can inspect JSON files interactively in Runme notebooks, e.g.:

```sh {"id":"01HF7B0KK32HBQ9X4ABZXDH898","terminalRows":"20"}
curl -s "https://api.marquee.activecove.com/getWeather?lat=52&lon=10" | fx
```
