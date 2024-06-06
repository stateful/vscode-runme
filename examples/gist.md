---
runme:
  id: 01HW3ZXNBSHJ4G57A97DC98XGE
  version: v3
---

# Runme Language Support

By default Runme can run everything that is also installed on your machine.

Shebang is a versatile tool designed to execute scripts written in various scripting languages including Shell, Perl, Python, Ruby, Node.js, and [more](https://docs.runme.dev/configuration/shebang). Runme integrates Shebang to enable users to run the script of their choice directly from the Markdown file in their preferred programming language.

Let's learn how to use multiple programming languages to interact with your containers!

In this example we will write a simple script in different programming languages that lists your running containers.

💡 Before starting, ensure you have the following installed in your machine:

- Docker 🐳
- Python 🐍 (for Python example)
- GCP ☁️

## Ensure docker is up and running

Run the following check, just to ensure you have Docker up and running

```sh {"id":"01HW3ZXNBSHJ4G57A970721V16","terminalRows":"3"}
# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed."
    exit
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null
then
    echo "Docker daemon is not running. ❌"
    exit
fi

echo "Docker is installed and running. ✅"

```

Ensure you have a list one container to list, if you don't have one, you can start a **nginx** container by running the following command:

```sh {"id":"01HW3ZXNBSHJ4G57A9725ZJ9SF"}
docker rm -f my_runme_demo_container
docker run -d --name my_runme_demo_container -p 8080:80 nginx
```

## Python 🐍

### Requirements

- Ensure you have python installed
- Create a virtual env
- Install the docker and prettytable packages

```sh {"id":"01HW3ZXNBSHJ4G57A975X1S4AT"}
python3 -m venv .venv
source .venv/bin/activate
pip3 install docker prettytable
```

Now you have all the requirements ready, run the following Python script to get a list of running containers in a nice table format.

```python {"id":"01HW3ZXNBSHJ4G57A977NS6P16"}
import docker
from prettytable import PrettyTable

def list_running_containers():
    client = docker.from_env()
    containers = client.containers.list()

    if containers:
        table = PrettyTable(["Container ID", "Name", "Image", "Status"])
        for container in containers:
            table.add_row([container.id[:12], container.name, container.attrs['Config']['Image'], container.status])
        print("Running containers:")
        print(table)
    else:
        print("No running containers found.")

if __name__ == "__main__":
    list_running_containers()
```

## GCP ☁️

```sh {"id":"01HW3ZXNBSHJ4G57A97AN0H6Y7"}
https://console.cloud.google.com/compute/instances?project=runme-ci
```
