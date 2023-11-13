[![](https://badgen.net/badge/Open%20with/Runme/5B3ADF?icon=https://runme.dev/img/logo.svg)](https%3A%2F%2Fgithub.com%2Fstateful%2Fhardening-ubuntu-server%2Fblob%2Fmain%2FREADME.md)

### Update and Upgrade the System

Ensure that all the packages and the system are up to date.

```sh
sudo apt update && sudo apt upgrade -y
sudo apt dist-upgrade
sudo reboot
```

### Configure Firewall

Enable and configure UFW (Uncomplicated Firewall) to only allow necessary services.

```sh
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable
```

### Install Fail2Ban

Fail2Ban protects against brute-force attacks.

```sh
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configure Automatic Security Updates

Install unattended-upgrades to automate security updates.

```sh
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Install and Configure Auditd

Auditd helps in maintaining a record of system events.

```sh
sudo apt install -y auditd
sudo systemctl enable auditd
sudo systemctl start auditd

```

### Secure Shared memory

Shared memory can be used in an attack against a running service, so it’s important to secure it.

```sh
echo "tmpfs     /run/shm     tmpfs     defaults,noexec,nosuid     0     0" | sudo tee -a /etc/fstab
```