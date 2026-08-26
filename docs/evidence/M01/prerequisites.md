# M1 external prerequisite evidence

Status: Inventory complete; provisioning remains intentionally closed  
Date: 2026-08-26

The canonical register is [`docs/external-prerequisites.md`](../../external-prerequisites.md). It records 15 validated prerequisite keys covering Apple Developer and App Store Connect, Expo ownership, Stripe test mode, Entra External ID, Azure region/cost/expiry ownership, and reserved domain/email placeholders.

Verification:

```sh
pnpm prerequisites:check
```

Result: Passed with 15 prerequisite records and four explicit safety boundaries.

The register uses role names and reserved `.example` values only. It contains no account identifier, tenant/subscription identifier, credential, provider key, live email address, or authorization to provision a service. This closes the M1 inventory task while preserving every live-provider approval as a later milestone gate.
