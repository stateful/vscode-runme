---
runme:
  id: 01HPM30C7SABJJVXR9CF9D85GX
  version: v3
---

# Setup your Google Cloud SDK

Be sure to install `gcloud` aka GCP SDK. Via `homebrew`:

```sh {"id":"01HPM36BJYQPJNPRXN1XEG5GTB"}
$ brew install --cask google-cloud-sdk
```

For all other platform consult GCP's official docs at https://cloud.google.com/sdk/docs/install-sdk. Then login:

```sh {"id":"01HPM3806ZWYRNJYXK4KW3KQ4M"}
$ gcloud auth login
```

The cloud notebook renderers will use the default credentials created by the login.