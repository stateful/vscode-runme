---
runme:
  id: 01HV6T1SX0AXY5H74ZDT6QATBY
  version: v3
---

# Getting started with Runme Noteboks for AWS

AWS provides a robust Command Line Interface (CLI) that enables you to efficiently oversee your AWS services directly from familiar shell environments such as **bash** or **zsh** on either your local machine or a remotely connected EC2 instance. This CLI empowers you to effortlessly craft shell scripts for seamless management of your AWS resources.

You can interact with your AWS Resources with Runme via the AWS CLI or Runme Notebook Cloud renderers.

💡 If you've already installed and configured the **AWS CLI**, feel free to jump directly to the available examples. Otherwise, keep reading for guidance.

Available guides:

- [AWS EC2 Cloud Renderers](ec2.md)
- [AWS EKS Cloud Renderers](eks.md)

## Installing AWS CLI

For UNIX based systems (macOS and Linux), you can use `Homebrew` to install `awscli`.

```sh {"id":"01HQRA46HYEXYTCYN03PY77Z9B"}
brew install awscli
```

For all other platform consult AWS's official docs at [https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html).

## Setting your working AWS profile

The AWS CLI conveniently stores frequently used configuration settings and credentials in files.

Within a credentials file, information is organized into profiles, each potentially holding data such as your **AWS Access Key ID** and **AWS Secret Access Key**.

It's crucial to note that if you manage multiple profiles, each with its associated credentials, you must specify a profile named **default**. As the name suggests, this profile serves as the default selection for the AWS CLI.

### List configured profiles

To list your configured profiles, execute the following command:

```sh {"id":"01HV6VND4H1HHJ9RPZC2BZBEFS"}
aws configure list-profiles
```

To display profile details, including access key, secret key, and region configuration information utilized for a specific profile, execute the following commands:

```sh {"id":"01HV6VWQWV48H1P32E3FBTZXQZ","promptEnv":"yes","terminalRows":"2"}
export AWS_PROFILE="stateful"
echo "Using AWS Profile $AWS_PROFILE"
```

```sh {"id":"01HV6VR5P3DNBBRS24G43P384G"}
aws configure list --profile $AWS_PROFILE
```

### Configuring a default profile

If you haven't configured a profile yet, you can create a default one by running the following command, ensure you have your Access Key ID and Secret Access Key at hand.

```sh {"background":"true","id":"01HQRA9RW8S8XJ21HFVW02VGBS","terminalRows":"10"}
aws configure
```

Congratulations! 🥳 Your AWS CLI is now configured correctly.

Experience your own **"Eureka!"** moment by visiting [Runme Cloud Renderers for EC2](ec2.md)
