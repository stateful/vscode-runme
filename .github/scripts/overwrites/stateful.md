---
cwd: ../../..
---

# Settings Overwrites

To overwrite Runme's defaults to match Stateful's run following commands:

```sh {"id":"01J1N29F9C3BCHS56FWF55DA0E","name":"overwrite-stateful"}
export EXTENSION_NAME="platform"
bash .github/scripts/overwrites/stateful.sh
```

To clean up and revert back to Runme's defaults, run the following commands:

```sh {"id":"01J1N2CE95P9D3ZQZNDQGMVFGX","name":"overwrite-reset"}
git checkout -f assets package.json 
```
