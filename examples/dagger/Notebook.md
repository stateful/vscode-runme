---
terminalRows: 20
---

# Runme ▶️ for Dagger

```sh {"excludeFromRunAll":"true","id":"01J097BHJHQS28M29YR0WCZ3B8","interactive":"false"}
curl -s "https://framerusercontent.com/images/tpJEZ337KKxXU4q1SSUXDx4FG4.png?scale-down-to=512"
```

Showcase the notebook experience to **author, debug, express, and run** Dagger pipelines.

### Let's use a Dagger function to build the Runme binary

```sh {"id":"01HZSMYF33TFKMEVRX5P64BNTB","interactive":"true","name":"RUNME_BINARY"}
dagger call \
    -m github.com/purpleclay/daggerverse/golang@v0.3.0 \
    --src "https://github.com/stateful/runme#main" \
    build \
        --arch $(go env GOARCH) \
        --os $(go env GOOS) \
    file \
        --path runme

```

### What does the 🐮 cow say?

```sh {"id":"01J022WD7Z6TM1QQ075X09BTK4","interactive":"true","name":"COWSAY"}
dagger call \
    -m github.com/shykes/daggerverse/wolfi@v0.1.4 \
    container \
        --packages=cowsay
```
