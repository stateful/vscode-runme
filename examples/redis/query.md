---
runme:
  id: 01HFBZHZ5QQQXP99SE2TD4SC6G
  version: v2.0
---

# Redis Query Runbook for Runme Cloud

### Prerequisites:

1. Access to GCP and the bastion host.
2. SSH keys set up.
3. Redis CLI installed on local machine and bastion host.

This commands describes your redis instance

```sh {"id":"01HFS20KP4P56TJR8SJ1R5E0RA","terminalRows":"26"}
export REDIS_NAME="runme-redis"
gcloud redis instances describe --region=us-central1 $REDIS_NAME
```

`runme-redis` change it to the name of your redis instance.

### Setting Up SSH Tunnel:

An SSH tunnel is a secure method of forwarding network traffic over an encrypted SSH connection. It's essential for connecting to Redis in cloud environments like GCP for several reasons: it encrypts data transmitted to the unsecured Redis service, ensures secure access without exposing Redis directly to the internet, and allows connection to Redis instances within private networks. This method is particularly useful for bypassing firewalls and NATs, making it easier and safer to manage Redis databases remotely.

```sh
# what's my jumphost?
gcloud compute instances list
```

```sh {"background":"true","id":"01HFS20KP4P56TJR8SJ527NA6G"}
export JUMP_HOST="eddie@34.172.87.12"
export REDIS_HOST="10.161.121.6"
ssh -L 16379:$REDIS_HOST:6379 $JUMP_HOST
```

Command: `ssh -L 16379:[REDIS_HOST]:6379 [USER]@[BASTION_HOST_IP]`

### Connecting to Redis via SSH Tunnel:

Note: Ensure the SSH tunnel is active. keep the terminal with the SSH tunnel open while using the Redis CLI.

```sh {"background":"true","id":"01HFS20KP4P56TJR8SJ7KQE1C4"}
redis-cli -p 16379
```

# Use Cases:

## Checking Rate-Limiting Status

checking the rate-limiting status typically involves querying a specific key to monitor how many requests a user has made within a set timeframe. This is crucial for implementing API rate limits, ensuring users don't exceed the number of allowed requests, thereby preventing abuse and maintaining server performance. Redis efficiently tracks and updates these counts due to its high-performance nature.

```sh {"id":"01HFS20KP4P56TJR8SJ9ZFTSE8"}
redis-cli -p 16379 GET rate_limit:12345
```

Command: `GET rate_limit:[user_id]`

## Listing All Keys

Get all the keys

```sh {"id":"01HFS20KP4P56TJR8SJARQZD38"}
redis-cli -p 16379 KEYS "*"
```

sidenote: The use of KEYS "*" can be resource-intensive on large databases and should be used cautiously in production environments.

## Monitoring Redis Performance

To get detailed statistics and information about the Redis server's performance and various metrics, use:

```sh {"id":"01HFS20KP4P56TJR8SJDEWWDKS"}
redis-cli -p 16379 INFO
```

sidenote: This command provides a lot of output, and users can specify sections like `INFO memory` for more targeted information

## Managing Data

### Setting a Key-Value Pair:

```sh {"id":"01HFS20KP4P56TJR8SJDY9E68W"}
redis-cli -p 16379 SET session_id abc123
```

Command: `SET [key] [value]`

### Retrieving a Value by Key:

To retrieve the value of key, use:

```sh {"id":"01HFS20KP4P56TJR8SJHG8E60E"}
redis-cli -p 16379 GET session_id
```

Command: `GET [key]`

## Working with Lists

### Adding Elements to a List:

To add a value message1 to a list named messages, use:

Command: `LPUSH [list] [value]`

```sh {"id":"01HFS20KP4P56TJR8SJMHZTDQ5"}
redis-cli -p 16379 LPUSH messages message1
```

## Managing Sets

Adding Members to a Set

Example Usage: To add a member user1 to a set named online_users, use:

```sh {"id":"01HFS20KP4P56TJR8SJR26MWFW"}
redis-cli -p 16379 SADD online_users user1
```

Command: `SADD [set] [member]`

## Advanced Data Structures

### HSET:

To set a field age with value 30 in a hash user:1001, use:

```sh {"id":"01HFS20KP4P56TJR8SJS8J1Y5V"}
redis-cli -p 16379 HSET user:1001 age 30
```

### HGET:

To get the value of age from user:1001, use

```sh {"id":"01HFS20KP4P56TJR8SJWAGGHHG"}
redis-cli -p 16379 HGET user:1001 age
```

## Administrative Commands

### Flushing:

To remove all data from all databases in the Redis server (use with caution)

```sh {"id":"01HFS20KP4P56TJR8SJXWE6T1Z"}
# uncomment if you're really sure
# redis-cli -p 16379 FLUSHALL
FLUSHALL
```

BGSAVE:

To asynchronously save the dataset to disk, use:

```sh {"id":"01HFS20KP4P56TJR8SJYYWEPN5"}
redis-cli -p 16379 BGSAVE
```
