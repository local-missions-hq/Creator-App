# Terraform boundary

This directory reserves the V1 Azure module and environment layout. M1 creates no Azure resources and stores no remote state.

The intended progression is:

1. Local M1–M4 development with Docker, Azurite, synthetic queues/identities, and Stripe test tooling.
2. Disposable, low-cost Azure development workloads that are built, tested, and destroyed the same day.
3. Private-network staging/production only after ordinary infrastructure and UI flows are complete and the security/cost gates approve it.

Do not add a production backend, credentials, subscription identifiers, or resource mutations merely to make this placeholder look complete.
