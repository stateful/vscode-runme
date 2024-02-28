# AWS EC2

Be sure to run through the on-time [setup instructions](setup.md).

List EC2 Instances

```sh {"id":"01HQRAF82SC4YPTNRGQ2TZ7DK2"}
https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#Instances
```

Display specific EC2 Instance

```sh {"background":"false","id":"01HQRAK03KBKPSZ47CRDDFJWDV"}
https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#InstanceDetails:instanceId=i-03bf8d64310964e31
```

Connect to EC2 instance via SSH

```sh {"background":"true","id":"01HQRAMMXGPYTFGQDMREZHNB37"}
aws ec2-instance-connect ssh --instance-id i-03bf8d64310964e31
```