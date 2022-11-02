# Deploying a Dockerized React App to Kubernetes Cluster

## Prerequisites
* Tutorial was done on macOS.
* Tutorial assumes you have Homebrew installed on you computer. If not, you can install here: https://brew.sh
* Tutorial assumes you have Docker installed on your computer. If not, you can install it here: https://docs.docker.com/docker-for-mac/install/

## Step 1: Dockerize app

### Build Docker image
```sh
$ docker build -t runme/demo .
```

### Run image locally to make sure it works
```sh { interactive=false }
$ docker run -d -p 3000:3000 runme/demo:latest
```

### Open Application

And see it running:

```sh
open http://localhost:3000
```

then stop the container:

```sh { interactive=false }
$ docker ps | grep runme/demo:latest
```

Stop the container via:

```sh
$ export RUNME_CID=<container-id>
$ docker stop $RUNME_CID
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

Cleanup everything:

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
