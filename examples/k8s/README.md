# Deploying a Dockerized React App to Kubernetes Cluster
Learn how to dockerize a React App and deploy it to a Kubernetes cluster with Linkerd.
Using the Linkerd CLI, you’ll install the control plane onto your Kubernetes cluster. Finally, you’ll “mesh” a application by adding Linkerd’s data plane to it.

## Prerequisites

* Tutorial was done on macOS.
* Tutorial assumes you have Homebrew installed on you computer. If not, you can install here: https://brew.sh
* Tutorial assumes you have Docker installed on your computer. If not, you can install it here: https://docs.docker.com/docker-for-mac/install/

## Step 1: Dockerize app

### Build Docker image

```sh { name=docker-build }
$ docker build -t runme/demo .
```

### Run image locally to make sure it works

```sh { name=docker-run interactive=false }
$ export RUNME_CID=$(docker run -d -p 3000:3000 runme/demo:latest)
$ echo "Container running with ID $RUNME_CID"
```

### Open Application

And see it running:

```sh { name=open-app interactive=false }
open http://localhost:3000
```

then stop the container:

```sh { name=docker-inspect interactive=false mimeType=text/x-json promptEnv=false }
$ docker inspect $RUNME_CID | jq ".[0].State"
```

Stop the container via:

```sh { name=docker-stop interactive=false }
$ docker stop $RUNME_CID > /dev/null && echo "Stopped container with ID $RUNME_CID"
```

## Step 2: Deploy application to Kubernetes Cluster with Linkerd

### Install Linkerd

```sh
brew install linkerd
```

Setup Linkerd in the cluster, via:

```sh
linkerd install --crds | kubectl apply -f -
```

and

```sh
linkerd install --set proxyInit.runAsRoot=true | kubectl apply -f -
```

### Build a config file for the deployment of the image onto the cluster

```sh { interactive=false }
kubectl create -f k8deployment.yaml --save-config
```

### View Kubernetes deployments to see if the app was deployed to your cluster and see status

```sh { interactive=false }
$ kubectl get deployments
```

### View Kubernetes pods to verify pods/replicas are running

```sh { interactive=false }
$ kubectl get pods
```

### Verify logs in pod to see if the server for React app started

```sh { interactive=false }
$ kubectl logs $(kubectl get pods -o=jsonpath='{.items[0].metadata.name}')
```

### Port forward service

```sh { background=true }
$ export SERVICE_NAME="runme-demo"
$ kubectl port-forward services/$SERVICE_NAME 3000:3000 -n default
```

### View your web app on the service by visiting http://EXTERNAL-IP:PORT

You can view what the final web app looks like here:

```sh
open http://localhost:3000/
```

### Inject Linkerd

```sh
kubectl get -n default deploy -o yaml \
  | linkerd inject - \
  | kubectl apply -f -
```

Install viz extension:

```sh
linkerd viz install | kubectl apply -f - # install the on-cluster metrics stack
```

Start Dashboard:

```sh { background=true }
linkerd viz dashboard --verbose
```

### Cleanup everything:

```sh
$ kubectl get -n default deploy -o yaml \
  | linkerd uninject - \
  | kubectl delete -f -
```

```sh
$ kubectl delete -f k8deployment.yaml
```

```sh
$ linkerd viz uninstall | kubectl delete -f -
```

```sh
$ linkerd uninstall | kubectl delete -f -
```
