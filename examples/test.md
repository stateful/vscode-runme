---
runme:
  id: 01HF7B0KJM3HHFDVSXA6E12JM3
  version: v3
---

# Runme Examples

This `README.md` contains some examples for executing e2e tests for the extension.
It covers Cell shell executions, GitHub integration and Codelense test suites

# Extension Example Markdown Files

This markdown file contains some custom examples to test the execution within a VS Code Notebook.

## Shell Executions

```sh {"background":"false","id":"01HF7B0KJM3HHFDVSX9YFTZ8PE","interactive":"false","name":"HelloWorld"}
echo "Hello World!"
```

```sh {"id":"01HF7B0KJM3HHFDVSXA100Y04X","promptEnv":"false"}
export FOO="don't prompt me"
```

# GitHub Action Integration

```yaml {"id":"01HF7B0KJM3HHFDVSXA44VPZSC"}
https://github.com/stateful/vscode-runme/actions/workflows/test-inputs.yml
```
