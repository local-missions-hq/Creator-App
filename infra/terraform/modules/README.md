# Future Azure resource modules

Expected modules include resource groups/tags, retained state and OIDC controls, Container Apps API/worker, PostgreSQL, private object storage, Service Bus, identity, observability, budget alerts, and later private networking.

The local foundation checkpoint intentionally adds no resource module. Before a module is introduced, its current AzureRM schema, service/SKU availability, price, network exposure, identity/RBAC, backup/recovery, scale ceiling, retention, and destroy ownership must be reviewed. A disposable module cannot own retained state, identity, DNS, budget, or policy resources.
