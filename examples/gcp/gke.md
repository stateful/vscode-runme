---
runme:
  id: 01HP534R7WPRP5ZGY23ZPGRNF4
  version: v3
---

# Google Kubernetes Engine

💡 **Important!** Be sure to run through the one-time guide [Getting started with Runme Noteboks for Google Cloud](setup.md).

Google Kubernetes Engine, abbreviated as GKE, empowers users to effortlessly oversee Kubernetes clusters through Google Cloud's managed service. It boasts automated lifecycle management alongside pod and cluster autoscaling capabilities.

You have the flexibility to engage with your Kubernetes cluster through the **gcloud SDK** or via Runme's **Cloud Native Renderer** tailored specifically for GKE. Moreover, you can seamlessly integrate and utilize both methods as needed.

## List clusters

To list your Kubernetes clusters, you need to specify a region and the project identifier, run the following command:

### Using gcloud SDK

```sh {"id":"01HVN24NDSRSXR4K68Z1D3S098","promptEnv":"yes","terminalRows":"3"}
export CLUSTERS_REGION="us-central1-c"
export CLUSTERS_PROJECT_NAME="runme-ci"
echo "You have selected the region $CLUSTERS_REGION and project $CLUSTERS_PROJECT_NAME"
```

Now you have configured the region and project, run the following command to list your clusters:

```sh {"id":"01HPM26EAZH5X2AW34XGWXBZ7B","terminalRows":"20"}
$ gcloud container clusters list --region=$CLUSTERS_REGION --project $CLUSTERS_PROJECT_NAME
```

### Connect gcloud with Kubectl

[Install kubectl and configure cluster access](https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl)

```sh {"id":"01J254YX4R2EZK3B63WX8ZFFQ5"}
$ export CLUSTER_NAME="ci-cluster"
$ gcloud container clusters get-credentials $CLUSTER_NAME --region=$CLUSTERS_REGION --project=$CLUSTERS_PROJECT_NAME
```

### Using Runme Native Cloud Renderers

Runme introduces a **Cloud Native Renderer** tailored for listing Kubernetes clusters, essentially functioning as a mission control dashboard.

For instance, if you want to see your Kubernetes cluster list in the Google Cloud Console, you open an URL like the following:

https://console.cloud.google.com/kubernetes/list/overview?project=runme-ci

Here, **"runme-ci"** serves as the project identifier.

To utilize this feature, simply paste a link from the console, specifying the desired project for visualization.

You'll be presented with a resources table akin to the Google Cloud interface, seamlessly integrated into your Runbook environment!

Run the following command (ensure you have provided a valid value for project-id)

```sh {"id":"01HP535BD16K2VDKBSB2RX7AZW"}
https://console.cloud.google.com/kubernetes/list/overview?project=$CLUSTERS_PROJECT_NAME
```

```sh {"background":"false","id":"01J1QPXCQB3WQ41SCHQHNS93T0"}
https://console.cloud.google.com/kubernetes/clusters/details/us-central1-c/cluster-2/details?project=runme-ci
```

You can also paste a cluster details link:

```sh {"id":"01HPM1579KFQPEDAN6YDTEPKR9"}
https://console.cloud.google.com/kubernetes/clusters/details/[location]/[account]/details?project=[project]
```
