# Jeremy's notes on building and compiling

* Don't merge this into the main repository

* Refer to [contributing.md](contributing.md) for more information

* It looks like we need nvm

```sh {"id":"01HXYXR0CKKKPWXX03JD8351XM"}
brew install nvm
```

```sh {"id":"01HXYXSYPH8HNBXE13M9H6VKTN"}
nvm install
```

* Install the recommended extensions
* The command in contributing.md assumes vscode binary is on the path

```sh {"id":"01HXYYA446MXF1CA2F2KKS41M3"}
jq -r ".recommendations[]" .vscode/extensions.json | xargs -n 1 /Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --force --install-extension
```