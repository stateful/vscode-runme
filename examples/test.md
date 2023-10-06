# Runme Examples

This `README.md` contains some examples for executing e2e tests for the extension.
It covers Cell shell executions, GitHub integration and Codelense test suites

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Shell Executions

```sh { background=false interactive=false }
echo "Hello World!"
```

```sh { promptEnv=false }
export FOO="don't prompt me"
```

# GitHub Action Integration

```yaml
https://github.com/stateful/runme-canary/actions/workflows/test-inputs.yml
```
