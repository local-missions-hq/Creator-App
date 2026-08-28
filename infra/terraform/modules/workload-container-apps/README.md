# Disposable workload Container Apps

Creates one environment, one API app, one worker app, and separate user-assigned identities. Eight resource-scoped role assignments grant only ACR pull, Blob contributor, Service Bus sender/receiver, and Key Vault secret-reader access. Images use immutable SHA-256 digests; registry passwords and Container App secret blocks are absent. API ingress is HTTPS-only and allowlisted, while the worker has no ingress and scales from Service Bus through managed identity. Both apps scale from zero to one candidate replica.
