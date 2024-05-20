---
runme:
  id: 01HQE7HX8KKY7X031B2B9E88GB
  version: v3
---

# Google Compute Engine

💡 **Important!** Be sure to run through the one-time guide [Getting started with Runme Noteboks for Google Cloud](setup.md).

Google Compute Engine (also known as GCE) enables users to launch virtual machines on demand. It supports different operating systems like Linux, FreeBSD, NetBSD and Windows.

With GCE, you can deploy Web and App servers, containerized microservices, virtual desktops, databases, and more.

For DevOps professionals seeking an overarching perspective on their VM instances for efficient management, the Google Cloud Console stands out as a preferred option. Common operations encompass:

- Secure SSH connections
- Pausing, stopping, terminating instances.
- Monitoring.
- Log viewing.

Runme introduces a **Cloud Native Renderer** tailored for listing VM instances, essentially functioning as a mission control dashboard.

## Functionality

To utilize this feature, simply paste a link from the console, specifying the desired project for visualization.

For instance:

https://console.cloud.google.com/compute/instances?project=runme-ci

Here, **"runme-ci"** serves as the project identifier.

You'll be presented with a resources table akin to the Google Cloud interface, seamlessly integrated into your Runbook environment!

Run the following command (ensure you have provided a valid value for project-id)

```sh {"id":"01HYBMAWD6Y8BCJ56289SJ2H3A","terminalRows":"5"}
export PROJECT_ID="runme-ci"
echo "PROJECT_ID set to $PROJECT_ID"
```

```sh {"id":"01HQE7NWNH8T6WRBNPE3943XBY"}
https://console.cloud.google.com/compute/instances?project=$PROJECT_ID
```