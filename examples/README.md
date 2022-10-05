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

To do X, export an environment variable as follows:

```sh
echo "Auth token for service foo"
export SERVICE_FOO_TOKEN=foobar
echo "Auth token for service bar"
export SERVICE_BAR_TOKEN="barfoo"
```

Then you have access to these:

```sh { interactive=false }
echo "SERVICE_FOO_TOKEN: $SERVICE_FOO_TOKEN"
echo "SERVICE_BAR_TOKEN: $SERVICE_BAR_TOKEN"
```
