---
runme:
  id: 01HF7B0KK32HBQ9X4AC2GPMZG5
  version: v3
sidebar_position: 1
title: Examples
---

# Runme Examples

Runme enables you to execute interactive runbooks using Markdown. More specifically, Runme runs your code and commands inside your fenced code blocks (shell, bash, zsh, but also, Ruby, Python, etc) see [shebang.md](shebang.md) to see more examples using different programming languages.

## Shell

### Shell scripts

You can author and execute Shell scripts inside a Runme Runbook, making them accessible alongside your operational documentation. Essentially, anything you can execute in your terminal can be seamlessly incorporated here, whether it's within a notebook cell or a separate .sh file.

Let's get started by running a simple script:

```sh {"id":"01HTZB059ZFK301922XA4B0Z6V"}
echo "What are you waiting for 👀 🕰"
sleep 2
echo "to write Runbooks 📔"
sleep 2
echo "with Runme? 🚀"
```

Now you get the idea, (isn't that cool ?) let's be creative and think about more advanced examples, let's write a Shell script that prints the following system information:

- Disk usage
- Memory usage
- CPU load

```sh {"id":"01HTZB059ZFK301922XBD5B88R","name":"shell-script","terminalRows":"20"}
#!/bin/bash

check_disk_usage() {
    echo "Disk Usage:"
    df -h
}

check_memory_usage() {
    echo "Memory Usage:"
    top -l 1 -s 0 | grep PhysMem | sed 's/, /\n         /g'
}

check_cpu_load() {
    echo "CPU Load:"
    uptime
}

log_results() {
    echo "Log Timestamp: $(date)"
    echo "-----------------------------------------"
    check_disk_usage
    echo "-----------------------------------------"
    check_memory_usage
    echo "-----------------------------------------"
    check_cpu_load
    echo "-----------------------------------------"
    echo "Log Ended"
}

log_results

```

### Interactive shell script

You can write interactive (Stdin) programs too without leaving your Markdown file!
Since this is a long running process, ensure we've marked the cell as a background process, otherwise the cell execution will block the Notebook UX, you can configure that at the cell level configuration section, check the background option from the advanced tab. [Learn more here](https://docs.runme.dev/configuration/cell-level#handle-long-running-processes).

Feel free to run the following shell script example, it's similar to the above example with the main difference is now interactive!, it will give you the following information about your system:

- Disk usage
- Memory usage
- CPU load

```sh {"background":"true","id":"01HTZB059ZFK301922XDGZZNQ0","name":"interactive-shell-script","terminalRows":"25"}
#!/bin/sh

check_disk_usage() {
    echo "Disk Usage:"
    df -h
}

check_memory_usage() {
    echo "Memory Usage:"
    top -l 1 -s 0 | grep PhysMem | sed 's/, /\n         /g'
}

check_cpu_load() {
    echo "CPU Load:"
    uptime
}

display_menu() {
  echo -e "_________________________________________________________________\n"
  echo "Hello! What operation you want to perform? (press ctrl+c to exit)"
  echo "1. Memory Usage"
  echo "2. Disk Usage"
  echo "3. CPU Load"
  echo -e "_________________________________________________________________\n"
  echo "Type the option number and hit enter"
}

# Function to handle Ctrl+C
ctrl_c_handler() {
    echo "Exiting..."
    exit 0
}

# Trap Ctrl+C signal
trap ctrl_c_handler SIGINT

while true; do
  display_menu
  read option

  case $option in
      1)
          echo " >> You selected: Memory Usage"
          check_memory_usage
          ;;
      2)
          echo " >> You selected: Disk Usage"
          check_disk_usage
          ;;
      3)
          echo " >> You selected: CPU Load"
          check_cpu_load
          ;;
      *)
          echo "Invalid option selected!"
          ;;
  esac
done
```

## Complex Output

The integrated Runme terminal is able to handle complex outputs too.

Take a look at the following example using Helm charts:

### Initialize a Helm Chart Repository

Ensure you have the following dependencies:

- **Kubernetes** cluster installed.
- A local configured copy of **kubectl**

Read a complete [installation guide](https://helm.sh/docs/intro/install/) for installing Helm

#### NGINX ingress controller for Kubernetes

Now you have all the dependencies let's install a **NGINX** ingress controller for **Kubernetes**, this will allow to use NGINX as reverse proxy and load balancer.

```sh {"background":"true","id":"01HTZB059ZFK301922XG2EDRWA","name":"get-nginx-ingress-info","terminalRows":"5"}
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

Please specify an identifier for your controller release:

```sh {"id":"01HTZB059ZFK301922XK8CSAV7","interactive":"false","name":"set-nginx-ingress-release-name","promptEnv":"yes"}
export NGINX_INGRESS_CONTROLLER_RELEASE_NAME="Release name"
echo "NGINX ingress controller release name:${NGINX_INGRESS_CONTROLLER_RELEASE_NAME}"
```

```sh {"id":"01HTZB059ZFK301922XQ0HWA91","name":"install-nginx-ingress-release"}
helm install $NGINX_INGRESS_CONTROLLER_RELEASE_NAME ingress-nginx/ingress-nginx
```

#### Check the status of the ingress controller

```sh {"background":"true","id":"01HTZB059ZFK301922XR8856MF","name":"check-nginx-ingress-release"}
kubectl get service --namespace default "$NGINX_INGRESS_CONTROLLER_RELEASE_NAME-ingress-nginx-controller" --output wide --watch
```

#### Visualize your Helm releases

Run the following command to list all deployed releases

```sh {"id":"01HTZB059ZFK301922XTQ6HJXF","name":"nginx-ingress-list"}
helm list
```

#### Check the status of the release

```sh {"id":"01HTZB059ZFK301922XVDSFWEN","name":"nginx-ingress-release-status","terminalRows":"25"}
helm status $NGINX_INGRESS_CONTROLLER_RELEASE_NAME
```

Now you are done, you can safely uninstall the Chart

```sh {"id":"01HTZB059ZFK301922XYBSZD11","name":"uninstall-nginx-ingress-release"}
helm uninstall $NGINX_INGRESS_CONTROLLER_RELEASE_NAME
```

## Environment Variables

### Single line

```sh {"id":"01HTZB059ZFK301922Y0ASXB4P","name":"set-kubeconfig","promptEnv":"yes","terminalRows":"2"}
#!/bin/bash
export KUBECONFIG=Insert kubeconfig file path
```

Verify the provided value for the environment var **KUBECONFIG**

```sh {"id":"01HTZB059ZFK301922Y49E91S2","name":"check-kubeconfig","terminalRows":"2"}
echo "KUBECONFIG: $KUBECONFIG"
```

### Multiple lines

Runme also supports multiple lines where the export is just somewhere in between:

```sh {"excludeFromRunAll":"true","id":"01HTZB059ZFK301922Y6Q2F4CJ","name":"set-tokens","promptEnv":"yes","terminalRows":""}
echo "Auth token for service foo"
export SERVICE_FOO_TOKEN="foobar"
echo "Auth token for service bar"
export SERVICE_BAR_TOKEN="barfoo"
```

verify:

```sh {"id":"01HTZB059ZFK301922Y78YYH7S","interactive":"false","name":"check-tokens"}
echo "SERVICE_FOO_TOKEN: $SERVICE_FOO_TOKEN"
echo "SERVICE_BAR_TOKEN: $SERVICE_BAR_TOKEN"
```

You can also change existing environment variables, like adding changes to `$PATH`:

```sh {"id":"01HTZB059ZFK301922YAVANQMG","interactive":"true","name":"export-path"}
export PATH="/some/path:$PATH"
echo $PATH
```

Supports piping content into an environment variable:

```sh {"id":"01HTZB059ZFK301922YCZVX6R6","name":"export-license"}
export LICENSE=$(cat ../LICENSE)
```

verify:

```sh {"id":"01HTZB059ZFK301922YD52Q415","interactive":"false","name":"check-license"}
echo "LICENSE: $LICENSE"
```

Support multiline exports:

```sh {"id":"01HTZB059ZFK301922YGE4AME1","name":"export-privatekey"}
export PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA04up8hoqzS1+
...
l48DlnUtMdMrWvBlRFPzU+hU9wDhb3F0CATQdvYo2mhzyUs8B1ZSQz2Vy==
-----END RSA PRIVATE KEY-----"
```

verify:

```sh {"id":"01HTZB059ZFK301922YHV46MJF","interactive":"false","name":"check-privatekey"}
echo "PRIVATE_KEY: $PRIVATE_KEY"
```

## Non-Shell Languages

You can use the `interpreter` annotation to use different programming languages or to visualize files in different formats, like YAML. See [shebang.md](shebang.md) to see more examples using different programming languages.

Take a look at the following YAML file for creating a Kubernetes Deployment object:

```yaml {"id":"01HTZB059ZFK301922YJXQTM2D","interpreter":"cat"}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80

```

Non-shell scripts can also access environment variables, and are run from the current working directory:

Export the following environment variable called __YOUR_NAME__

```sh {"id":"01HTZB059ZFK301922YMJNQ6RH","interactive":"false","promptEnv":"yes"}
export YOUR_NAME=enter your name
```

Run the following python script that reads the environment variable specified in the previous step:

```python {"id":"01HTZB059ZFK301922YNN12VKZ","interpreter":"/usr/bin/python3"}
import os

def main():
    your_name = os.environ.get("YOUR_NAME")
    print(f"Hello, {your_name}, welcome to Runme!")

if __name__ == "__main__":
    main()

```

## Curl an image

You can visualize static and dynamic images inside your Runbook.

Run the following curl command to render a Kubernetes cluster Grafana dashboard.

```sh {"id":"01HTZB059ZFK301922YRJ9G5EW","interactive":"false,","mimeType":"image/png"}
curl -s https://grafana.com/api/dashboards/6417/images/4128/image
```

## Inspect JSON files

With [`antonmedv/fx`](https://github.com/antonmedv/fx) you can inspect JSON files interactively in Runme Notebooks.

Ensure you have **fx** installed (it requires [go](https://go.dev/)), run the following command:

```sh {"id":"01HTZB059ZFK301922YTAQ7XVY"}
go install github.com/antonmedv/fx@latest
```

Now you can explore any json file interactively, run the following command to explore the weather at Berlin 🍻

```sh {"background":"true","id":"01HTZB059ZFK301922YVFFN8R5","promptEnv":"no","terminalRows":"20"}
export FX_THEME="2"
curl -s "https://api.marquee.activecove.com/getWeather?lat=52&lon=10" | fx
```

💡 Pro tip: If you want to explore the available fx commands, type **?**
