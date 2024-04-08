---
runme:
  id: 01HF7B0KJQ8625WYMCRVJADMQF
  version: v3
---

# Runme Language Support

By default Runme can run everything that is also installed on your machine.

Shebang is a versatile tool designed to execute scripts written in various scripting languages including Shell, Perl, Python, and more. Runme integrates Shebang to enable users to run the script of their choice directly from the Markdown file in their preferred programming language.

Read more in our [docs](https://docs.runme.dev/features#interpreter)

Let's learn how to use multiple programming languages to interact with your containers!

In this example we will write a simple script in different programming languages that lists your running containers.

💡 Before starting, ensure you have the following installed in your machine:

- Docker 🐳
- Python 🐍 (for Python example)
- Ruby 💎 (for Ruby example)
- PHP 🤨 (for PHP example)

## Ensure docker is up and running

Run the following check, just to ensure you have Docker up and running

```sh {"terminalRows":"3"}
#!/bin/bash

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

```sh
docker run -d --name my_runme_demo_container -p 8080:80 nginx
```

## Python 🐍

### Requirements
- Ensure you have python installed
- Install the docker and prettytable packages

```sh {"terminalRows":"20"}
pip install docker prettytable
```

```py
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

## Ruby

### Requirements

- Ensure you have Ruby installed
- Install docker-api and terminal-table gems

Ensure you have ruby installed at least running version >= 2.7.0, run the following command:

```sh {"terminalRows":"2"}
ruby -v
```

### Installing Ruby

If you are running an outdated version, you can use rvm (Ruby Version Manager) to install it.
Run the following command:

```sh
curl -sSL https://get.rvm.io | bash
```

💡 Follow up the output instructions from the above command in order to have **rvm** command available in the terminal, usually you will need to run the **source** command.

Install the specific ruby version needed for our demo

```sh
rvm install "ruby-2.7.2"
```

Now you have installed ruby, ensure you are using that specific version, run the following command:

```sh {"terminalRows":"3"}
rvm current
```

Install required gems

```rb
require 'docker'
require 'terminal-table'

def list_running_containers
  Docker.url = 'unix:///var/run/docker.sock'
  containers = Docker::Container.all(:all => true)

  if containers.any?
    table = Terminal::Table.new :headings => ['Container ID', 'Name', 'Image', 'Status', 'Ports'] do |t|
      containers.each do |container|
        t << [container.id[0..11], container.info['Names'][0], container.info['Image'], container.info['State'], container.info['Ports']]
      end
    end
    puts "Running containers:"
    puts table
  else
    puts "No running containers found."
  end
end

list_running_containers

```

## or JavaScript:

```js
console.log("Run scripts via Shebang!")
```

## even TypeScript:

Make sure you have `ts-node` installed globally:

```sh
npm i -g ts-node
```

then run:

```ts
const myVar: string = 'I am a typed string!'
console.log(myVar)
```

## and, of course, PHP

Be sure to have the `php` interpreter in your `$PATH`:

```php {"interpreter":"php"}
<?php
$greeting = "Hello, World!";
$currentDateTime = date('Y-m-d H:i:s');

// Concatenate the greeting with the current date and time
$fullGreeting = $greeting . " It's now " . $currentDateTime . "\n";

echo $fullGreeting;
?>
```
