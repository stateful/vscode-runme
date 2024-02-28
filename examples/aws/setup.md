# Setup your AWS SDK

Be sure to install `aws`. Via `homebrew`:

```sh {"id":"01HQRA46HYEXYTCYN03PY77Z9B"}
brew install awscli
```

For all other platform consult AWS's official docs at [https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html).

Configure your profile

```sh {"id":"01HQRA9RW8S8XJ21HFVW02VGBS"}
aws configure
```

The cloud notebook renderers will use always the default profile