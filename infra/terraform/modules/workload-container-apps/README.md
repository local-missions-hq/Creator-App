# Disposable workload Container Apps

Creates one environment plus separate API, dashboard, and worker identities. Nine resource-scoped role assignments grant the API/worker only their reviewed ACR, Blob, Service Bus, and Key Vault permissions while the dashboard receives ACR pull only. The three Container App resources are a second phase behind `application_activation_enabled`, because their immutable images cannot exist in the disposable ACR until the core phase creates it.

After the API, dashboard, and worker images are built, scanned, signed, pushed, and independently verified by digest, the activation phase adds exactly those three apps. Images use immutable SHA-256 digests; registry passwords and Container App secret blocks are absent. API and dashboard ingress are HTTPS-only and allowlisted, while the worker has no ingress and scales from Service Bus through managed identity. All three apps scale from zero to one candidate replica.
