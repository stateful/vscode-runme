# Mutual TLS troubleshooting

With Runme's rollup terminals. This example will fail out of the box to illustrate the break-fix process.

```sh {"id":"01J8MYG23EGH12PBKQGTYXTHY1","promptEnv":"no","terminalRows":"3"}
export HTTPS_ENDPOINT="https://localhost:8443"
export TLS_DIR_EXPIRED="/tmp/runme/tls_expired"
export TLS_DIR_VALID="/tmp/runme/tls_valid"
export TLS_DIR_SERVER=${TLS_DIR_VALID}
export TLS_DIR_CLIENT=${TLS_DIR_EXPIRED}
echo "Using TLS certs at client: ${TLS_DIR_CLIENT} and server: ${TLS_DIR_SERVER} against ${HTTPS_ENDPOINT}"
```

### Launch 🔐 mTLS server

Copilot wrote this server. Super easy.

```javascript {"background":"true","id":"01J8MY68T051TQRAYQY6PF5NCE","terminalRows":"3"}
const https = require("https");
const fs = require("fs");
const path = require("path");

const tlsdir = process.env.TLS_DIR_SERVER;

// Load the required certificates and keys
const options = {
  key: fs.readFileSync(path.join(tlsdir, "key.pem")), // Server's private key
  cert: fs.readFileSync(path.join(tlsdir, "cert.pem")), // Server's certificate
  ca: fs.readFileSync(path.join(tlsdir, "cert.pem")), // CA certificate to verify clients
  requestCert: true, // Request a certificate from clients
  rejectUnauthorized: true, // Reject clients with invalid certificates
};

https
  .createServer(options, (req, res) => {
    if (req.client.authorized) {
      res.writeHead(200);
      res.end("Hello, secure world with 🔐 mutual TLS!\n");
    } else {
      // Invalid certs won't even get us here
      res.writeHead(401);
      res.end("Client certificate required or invalid!\n");
    }
  })
  .listen(8443, () => {
    console.log("HTTPS server 🚀 listening on port 8443");
  });
```

### Issue GET with 📑 client certs

Fingers crossed 🤞. mTLS can be finicky. The server's CA cert is valid, but the client's are expired.

```sh {"id":"01J8MYF3P969FE3JXY5W4TSHKJ","terminalRows":"20"}
curl -i --cacert ${TLS_DIR_VALID}/cert.pem --cert ${TLS_DIR_CLIENT}/cert.pem --key ${TLS_DIR_CLIENT}/key.pem ${HTTPS_ENDPOINT}
```
