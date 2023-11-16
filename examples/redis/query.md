#  Redis Query Runbook for Runme Cloud

### Prerequisites:

1. Access to GCP and the bastion host.
2. SSH keys set up.
3. Redis CLI installed on local machine and bastion host.

This commands describes your redis instance 

```sh
gcloud redis instances describe --region=us-central1 runme-redis
```

`runme-redis` change it to the name of your redis instance.

### Setting Up SSH Tunnel:

Command: ssh -L 16379:[REDIS_HOST]:6379 [USER]@[BASTION_HOST_IP].

```sh
ssh -L 16379:10.161.121.6:6379 eddie@34.172.87.12
```

### Connecting to Redis via SSH Tunnel:

Note: Ensure the SSH tunnel is active.

```sh
redis-cli -p 16379
```

# Use -case:

## Checking Rate-Limiting Status

Command: GET rate_limit:[user_id]

Example Usage: To check the rate-limiting status for a user with ID 12345, use:

```sh
GET rate_limit:12345
```

## Listing All Keys

Get all the keys

```sh
redis-cli -p 16379 KEYS "*"
```

## Monitoring Redis Performance

Example: Checking Redis Server Statistics

Command: INFO
Example Usage: To get detailed statistics and information about the Redis server's performance and various metrics, use:

Get Redis Info

```sh
INFO
```

## Managing Data

Example: Setting a Key-Value Pair

Command: SET [key] [value]
Example Usage: To set a key named session_id with a value abc123, use:

```sh
SET session_id abc123
```

Example: Retrieving a Value by Key

Command: GET [key]
Example Usage: To retrieve the value of session_id, use:

```sh
GET session_id
```

## Working with Lists

Example: Adding Elements to a List

Command: LPUSH [list] [value]
Example Usage: To add a value message1 to a list named messages, use:

```sh
LPUSH messages message1
```

##  Managing Sets

Adding Members to a Set

Command: SADD [set] [member]

Example Usage: To add a member user1 to a set named online_users, use:

```sh
SADD online_users user1
```

## Advanced Data Structures

### HSET:

To set a field age with value 30 in a hash user:1001, use:

```sh
HSET user:1001 age 30
```

### HGET:

To get the value of age from user:1001, use

```sh
HGET user:1001 age
```

## Administrative Commands

### Flushing:
To remove all data from all databases in the Redis server (use with caution)

```sh
FLUSHALL
```

BGSAVE:

To asynchronously save the dataset to disk, use:

```sh
BGSAVE
```