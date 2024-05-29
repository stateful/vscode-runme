---
runme:
  id: 01HPM30C7SABJJVXR9CF9D85GX
  version: v3
---

# Getting started with Runme Noteboks for Google Cloud

Google Cloud Platform, also known as GCP, is a suite of cloud computing services from Google.

In this guide, you will interact with GCP resources using the **gcloud SDK**, a set of tools to create and manage Google Cloud resources. Operators usually interacts with gcloud via command line, scripts or specific automation tools.

💡 If you've already installed and configured **gcloud SDK**, feel free to jump directly to the available examples. Otherwise, keep reading for guidance.

Available guides:

- [Google Cloud Engine](gce.md)
- [Google Kubernetes Engine](gke.md)
- [Google Cloud Run](cloudRun.md)

## Install gcloud SDK

#### Via Homebrew

```sh
$ brew install --cask google-cloud-sdk
```

#### Other platforms

Consult GCP's official docs at [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

Once you've installed the **gcloud SDK**, authenticate with your authorized Google credentials to begin interacting with your Google Cloud resources.

Run the following command, which will prompt a browser window to appear. Follow the on-screen instructions to complete the authentication process. Once authorized, you'll receive confirmation within the terminal output of this guide step, displaying your authenticated account and the current project details.

```sh {"background":"true"}
$ gcloud auth login
```

## Setup default credentials

To instruct Runme Notebooks on which credentials to use for interacting with GCP resources, it's crucial to execute the following step. This process will acquire your credentials through a web flow and place them in the well-known location for Application Default Credentials (ADC).

```sh {"name":"set-gcloud-default"}
$ gcloud auth application-default login
```

The cloud notebook renderers will use the default credentials created by the login.