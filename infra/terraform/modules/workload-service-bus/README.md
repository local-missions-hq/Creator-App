# Disposable workload Service Bus

Creates one Standard candidate namespace and one durable queue with local authorization disabled, TLS 1.2, default-deny IP filtering, no trusted-services bypass, duplicate detection, bounded retries, and dead-lettering. Standard replaces the earlier Basic candidate because Azure does not support duplicate detection on Basic; pricing and regional availability remain unapproved.
