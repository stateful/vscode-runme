---
cwd: ../../..
---

# Settings Overwrites

Remove panels mostly relevant for development.

```sh {"id":"01J7EZNXTG43WAYRWPFX7MHN7F","interactive":"false","name":"deactivate-panels"}
npm pkg delete "contributes.views.runme[id='runme.chat']"
npm pkg delete "contributes.views.runme[id='runme.search']"
npm pkg delete "contributes.terminal"
npm pkg set "contributes.configuration[0].properties[runme.experiments.smartEnvStore].default=false" --json
git diff package.json
```

Remove smart env store panels.

```sh {"id":"01J7EZQJX1843SKQCRC7P8BHYV","interactive":"false","name":"deactivate-smartenv"}
npm pkg delete "contributes.views[runme-notebook]"
npm pkg delete "contributes.viewsContainers.panel"
git diff package.json
```

```sh {"excludeFromRunAll":"true","id":"01J7EZQSG262FMGJAYG1W6Z3EQ"}
git checkout -f package.json
git diff package.json
```
