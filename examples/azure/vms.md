---
runme:
  id: 01J1QKY3H4QRP73MH8154KDXCE
  version: v3
---

# Azure

While Azure cloud renderers are being worked on. Runme's bash support allows usage of the Azure CLI, aka `az`, to manage cloud resources.

## Environment setup

```sh {"id":"01J1FNNMPCRRVGC7N5Y8J7QJDJ","terminalRows":"4"}
az login

export AZURE_RESOURCE_GROUP="STATEFUL"
export AZURE_LOCATION="eastus"
export AZURE_TENANT_DOMAIN=`az account show | jq -r '.tenantDefaultDomain'`
export AZURE_SUBSCRIPTION_ID=`az account show | jq -r '.id'`

echo "Azure resource group $AZURE_RESOURCE_GROUP"
echo "Azure location $AZURE_LOCATION"
echo "Azure tenant domaind $AZURE_TENANT_DOMAIN"
echo "Azure subscription id $AZURE_SUBSCRIPTION_ID"
```

## VMS List

https://portal.azure.com/#browse/Microsoft.Compute%2FVirtualMachines

```sh {"id":"01J1FNET3B81PQDND70QX7YEAC","terminalRows":"7"}
az vm list --query "[].{id: id,name: name}"
```

## VM Details

```sh {"id":"01J1FNG4V5F0XFFCFCRVSH4JC2"}
az vm show --query "{name: name, location: location}" --resource-group=$AZURE_RESOURCE_GROUP --name=ubuntu
```

```sh {"id":"01J1FQ8DZRP0V7QH79EJKVR5JE","terminalRows":"3"}
export INSTANCE_ID="/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/$AZURE_RESOURCE_GROUP/providers/Microsoft.Compute/virtualMachines/ubuntu"

echo "Azure instance ID $INSTANCE_ID"
```

```sh {"id":"01J1FQ2KNV2PRE4WZV58ZGR04Q"}
echo "https://portal.azure.com/#@${AZURE_TENANT_DOMAIN}/resource${INSTANCE_ID}/overview"
```