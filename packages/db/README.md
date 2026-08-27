# Local Missions database package

This package owns the PostgreSQL schema, append-only Drizzle migrations, and transactional repositories. Current commands are deliberately restricted to the loopback `local_missions` database; staging and production require a later explicit deployment path.

## Local workflow

```sh
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm test:integration
```

`db:seed` is repeatable and uses only the synthetic Lakeview Discovery Center workspace. The first M3 slice stores money as integer minor units, enforces the 20-slot pilot ceiling, and commits campaign status history, audit evidence, and idempotency responses in the same transaction as each campaign transition. The second slice adds one shared root user, opaque provider identity bindings, creator locality/payout state, business memberships, and tenant-scoped locations without storing an identity email.

## Migration rule

Committed migrations are append-only. Do not edit or run a destructive down migration after a migration is applied. If a migration fails, stop writes, preserve the error and database state, correct the schema through a new forward migration, and retest both an empty database and the prior committed schema before release.
