# Disposable workload telemetry

Creates a capped 30-day Log Analytics workspace and workspace-based Application Insights resource. Local authentication and internet query access are disabled; ingestion remains available for the temporary Container Apps workload until private networking exists. Connection strings and instrumentation keys are never exported or placed in Terraform-managed application secrets.
