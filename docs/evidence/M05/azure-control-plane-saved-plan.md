# Azure retained control-plane saved-plan evidence

Status: exact saved plan applied and independently verified; **no disposable workload deployed**
Date: 2026-09-01
Checkpoint: `M05-control-plane-applied-verified-022`

## Owner decisions

- The monitored alert destination was supplied process-only and is not retained in source or evidence.
- The sole repository collaborator is the required reviewer for the three main-only GitHub environments; administrator bypass is disabled. Because there is only one human collaborator, self-review prevention remains disabled as an explicit single-human exception.
- The monthly Azure budget is `$100` with 50%, 80%, and 100% actual and forecast alerts. This is an alert threshold, not a target or hard cap.
- The first future disposable workload run uses the `$2` two-hour smoke tier. The `$5` eight-hour tier is a separately justified fallback only.

## Saved plan

- Logical artifact: `local-missions-control-plane.tfplan`
- SHA-256: `ccd9fc52f84c0815326f9ec04ff57019ab43956a39c1fdcd4e36b7dc3b1aa951`
- Generated: `2026-09-01T12:02:48Z`
- Expires: `2026-09-01T20:02:48Z`
- Size/mode: 15,885 bytes, `0600`
- Terraform/AzureRM: 1.15.7 / 5.0.1
- Provider lock SHA-256: `71dfddefb8c7d0b3c89bc300587ad764ccde47fce1c43f122f7e600ba4050c33`
- Control-plane source SHA-256: `b002fd24cec645b0258fc74926bb9aa95210c49de7e61b2515f52fb407915e91`
- Binary and raw JSON remained outside the repository; the consumed binary was removed after verification.

Two independent sanitized reviews found exactly 20 creates, zero changes, zero deletes, zero replacements, and zero paid workload resources:

- two retained resource groups;
- three user-assigned workflow identities;
- three immutable GitHub federated credentials;
- two lifecycle-separated custom role definitions;
- five landing-zone-scoped workflow assignments;
- three state-container-scoped Blob data assignments;
- one Action Group; and
- one `$100` Local Missions-filtered budget with three actual and three forecast alerts.

The plan contains no client secret and no known secret-shaped value. The single known email value came from process-only input and is not stored in the repository. Planning initialized the expected empty `local-missions/control-plane.tfstate` object; it contained zero managed resources. Live inventory after planning remained one retained resource group, one top-level Storage account, and two tracked role assignments.

## Apply and verification

The owner explicitly approved the exact saved-plan SHA-256 before expiry. Terraform applied only that artifact and reported **20 added, zero changed, zero destroyed**. The control-plane state now contains 20 managed resources plus one provider data reference.

Independent live Azure queries verified:

- exactly three retained resource groups: state, control, and an empty Local Missions workload landing zone;
- three user-assigned identities and three GitHub federated credentials whose issuer, audience, and immutable owner/repository/environment subjects match current GitHub metadata;
- two custom roles, five landing-zone workflow assignments, and three workflow state-container assignments;
- one separately tracked temporary operator state-container assignment, retained until a no-apply GitHub OIDC proof and recovery-path review pass;
- one Action Group with one process-only receiver; and
- one `$100` Local Missions-filtered budget with 50%, 80%, and 100% actual and forecast notifications.

Azure normalized the protected budget period to September 1, 2026 through September 1, 2027. The first normal verification plan correctly refused the stale August configuration because `prevent_destroy` blocked budget replacement. The local defaults were corrected to the live normalized period; no Azure mutation was performed for that correction, and the next normal provider-backed plan reported **No changes**. The post-apply control source SHA-256 is `eee9a24837e0cd856e4370ec386ce08681ede230a4150278f8fcfdfcf4013f61`.

## Incidents and boundary

The first subject-construction attempt included a shell typo and was rejected before a valid plan. Its transient error output exposed public numeric GitHub identifiers, but no credential, token, email, Azure identifier, public IP, Terraform state, or repository file. The failed temporary directory was moved to Trash for recoverable cleanup. A first secondary-policy check also used the wrong expected tag key and failed safely; the corrected exact-tag review passed.

During apply/verification, the live-output sanitizer redacted emails, IPs, and ordinary UUIDs but missed several generated role-assignment identifiers and one encoded provider data-source identifier. A malformed first refresh variable also printed one public GitHub numeric identifier. No credential, token, secret, monitored email, public IP, state payload, or customer data was exposed or retained. Later verification output used whole-ID redaction.

The apply approval is consumed. It did not authorize GitHub workflow activation, temporary operator-role removal, the 27-resource workload core, image publication, Container Apps activation, cloud tests, recovery, or destroy. The next gate is separate approval for a no-apply GitHub OIDC remote-state/access-policy proof.
