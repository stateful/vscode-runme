# Google Cloud Run

💡 **Important!** Be sure to run through the one-time guide [Getting started with Runme Noteboks for Google Cloud](setup.md).

Cloud Run is a fully managed platform that enables you to run your code directly on top of Google’s scalable infrastructure. Cloud Run is simple, automated, and designed to make you more productive. You don't need to manage infrastructure.

With Cloud Run, you can run frontend and backend services, batch jobs, deploy websites and applications, and queue processing workloads.

For DevOps professionals seeking an overarching perspective on their Cloud Run services for efficient management, the Google Cloud Console stands out as a preferred option. Common operations encompass:

- Creating new services
- Creating new revisions
- Monitoring.
- Log viewing.

Runme introduces a **Cloud Native Renderer** tailored for listing Cloud Run Services, essentially functioning as a mission control dashboard.

## Functionality

To utilize this feature, simply paste a link from the console, specifying the desired project for visualization.

For instance:

```sh {"id":"01HZFE5B0R1FHM1BJVRXKFE2HH"}
export PROJECT_ID="runme-ci"
echo "PROJECT_ID set to $PROJECT_ID"
```

```sh {"id":"01HZFE5B0R1FHM1BJVRXKJ4T8W"}
https://console.cloud.google.com/run?project=$PROJECT_ID
```

```sh {"background":"true","id":"01HZFGE40Y5PWM98DZPAVPYGPK"}
https://console.cloud.google.com/run/detail/us-central1/cloud-backend/revisions?project=production-5df4
```

Here, **"runme-ci"** serves as the project identifier.

You'll be presented with a resources table akin to the Google Cloud interface, seamlessly integrated into your Runbook environment!

Runme will fetch automatically all your Cloud Run Services across all available Regions.

Run the following command (ensure you have provided a valid value for project-id)