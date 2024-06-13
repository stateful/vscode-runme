# Runme ▶️ for Dagger

Showcase the notebook experience to **author, debug, express, and run** Dagger pipelines.

### Let's use a Dagger function to build the Runme binary

```sh {"id":"01HZSMYF33TFKMEVRX5P64BNTB","interactive":"true","name":"RUNME_BINARY"}
dagger --progress=$PROGRESS \
    call \
        -m github.com/purpleclay/daggerverse/golang@7e83bccc350fa981e975ac0c8619f92a1b729958 \
        --src "https://github.com/stateful/runme#main" \
    build \
        --arch $(go env GOARCH) \
        --os $(go env GOOS) \
    file \
        --path runme
```

### What does the 🐮 cow say?

```sh {"id":"01J022WD7Z6TM1QQ075X09BTK4","interactive":"true","name":"COWSAY"}
dagger --progress=plain \
    call \
        -m github.com/shykes/daggerverse/wolfi@v0.1.2 \
    container \
        --packages=cowsay
```

👉 Let's continue over here with the [pipeline demo](../../dagger/Pipeline.md).
