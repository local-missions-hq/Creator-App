# M1 clean-checkout evidence

Status: Passed after one retained clean-cache failure  
Date: 2026-08-26  
Passing commit: `6b45356319c81d1ca3e39f35751f887845afa57a`

## Preconditions

- The project first received a recoverable local root commit; nothing was pushed to GitHub.
- The passing source was cloned with `git clone --no-hardlinks` into a new `/tmp/local-missions-m1.*` directory.
- The clone reported the exact commit above, a clean branch, Node `24.19.0`, and no `node_modules` directory before installation.

## Retained first failure

The first independent checkout of commit `0211e22` installed successfully but failed mobile type checking because four PNG imports could not be resolved. The pre-commit lint repair had converted `apps/mobile/assets.d.ts` from a global ambient declaration into an external module; the warm source checkout's Turbo cache had masked the problem.

Resolution:

- Restored the correct inline `import('react-native').ImageSourcePropType` ambient declaration.
- Added a narrow `**/*.d.ts` lint override for `consistent-type-imports` rather than weakening application-source rules.
- Ran forced, zero-cache lint and type checks across all eight packages before committing the repair as `6b45356`.

## Passing independent checkout

From the new clone:

```sh
pnpm install --frozen-lockfile
pnpm verify
pnpm test:security
pnpm test:gitleaks
pnpm test:e2e:mobile
```

Results:

- Frozen install added 761 packages to a new virtual store in the clone. The machine's content-addressable pnpm download cache was reused; no dependency or build directory was copied from the source checkout.
- The complete eight-package `verify` run passed with zero Turbo cache hits for lint, type check, tests, contracts, and builds.
- All package tests passed, including 25 mobile tests.
- The fallback scanner passed 217 text files; Gitleaks scanned approximately 4.52 MB and found no leaks.
- Static Maestro validation passed two YAML flows and 31 source-backed test IDs. This is not represented as actual Simulator Maestro execution.
- `git status --short --branch` remained clean after ignored dependency and build outputs were generated.

Both temporary checkout trees were removed after their evidence was recorded. They contained only recoverable clones, ignored dependencies, and generated build output.
