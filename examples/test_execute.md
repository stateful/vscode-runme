* Why can't my pod access GCS?
* Is workload identity properly configured
* It uses the default service account

```bash
for i in {0..100}
do
    echo Loop Iter $i
    sleep 1
done
```

```bash {"id":"01JAH0T4B4KPSKKYAFPA5XW56C","interactive":"false"}
# 1. Verify the annotations on the Kubernetes service account to ensure it's linked to the correct Google Cloud service account
kubectl get serviceaccount default -o yaml

# 2. Check the IAM roles assigned to your Google Cloud service account
gcloud iam service-accounts get-iam-policy <SERVICE_ACCOUNT_EMAIL>
```

```bash {"id":"01JAH0QZWEW7057D79ZY7S266M","interactive":"false"}
# 1. Verify Workload Identity is enabled on your GKE cluster
gcloud container clusters describe dev --region=us-west1 --format="value(workloadIdentityConfig)"

# 2. Check if the Kubernetes service account is annotated with the correct IAM service account
#kubectl get namespace

```

```bash {"interactive":"true"}
kubectl get serviceaccount default -o yaml
```