# M03 deliverable submission and review checkpoint

Checkpoint: `M03-submission-review-005`  
Date: 2026-08-27  
Result: Passed; M3 overall remains open

## Boundary implemented

- Each campaign's latest accepted brief has an immutable ordered set of objective deliverable requirements. V1 photo, raw-clip, edited-video, social-post, private-response, and attendance-proof types use structured counts, MIME types, duration, orientation, resolution, disclosure, and evidence rules.
- A campaign cannot move from draft to submitted until its latest brief has at least one locked deliverable requirement in addition to its reconciled slot contract.
- Each accepted mission assignment records the exact campaign brief version that the creator accepted. Forward migration `0004_handy_gideon.sql` safely backfills existing assignments before making that reference required.
- Upload registration begins only after verified check-in. The database retains a private object key, SHA-256 checksum, MIME type, byte size, duration/dimensions/orientation metadata, and validation state; it contains no public URL or media blob.
- Media begins in `pending_scan` and can become `verified`, `quarantined`, or `rejected`. Only verified media satisfying every locked objective criterion can enter a complete submission.
- Complete submission validates every required group and count before writing any attempt, asset link, evidence item, history row, or audit event. The review deadline is exactly PostgreSQL `now() + 48 hours`.
- Duplicate completion requests lock the assignment and allow one winner. Attempt 2 exists only after one valid objective correction request and before its server-time deadline; no third attempt or second correction is permitted.
- Only an active owner or manager in the campaign's exact business workspace can review. Approval atomically completes the submission, assignment, application, and slot with matching history and audit rows.
- If the business takes no valid action before the 48-hour deadline, a service actor can auto-approve. PostgreSQL time is authoritative, and concurrent workers permit exactly one final decision.

## Real PostgreSQL proof

1. Applied migrations `0000`–`0003`, inserted a complete synthetic checked-in assignment, then applied `0004`; the assignment and exact accepted brief reference were preserved.
2. Confirmed all eight new submission tables and inspected the relevant schema for follower, public-URL, blob, latitude, and longitude fields; none were present.
3. Proved a campaign with a brief and slots but no deliverable requirements cannot submit. An out-of-range raw-clip contract rolled back with zero requirement rows.
4. Proved media registration and complete submission both fail before verified check-in, with zero media and submission rows.
5. Submitted a full checklist containing quarantined media, then a missing-count checklist, then an undersized-media checklist. Each failed with zero attempt, asset-link, and submission-history rows.
6. Raced two complete-submission requests. Exactly one committed seven asset links and a 48-hour review; the other returned `SUBMISSION_ALREADY_EXISTS`.
7. Denied review from another business without a decision row. The correct business requested one criterion-specific correction, the creator made attempt 2, a second correction was rejected, and approval completed the application, assignment, and slot together.
8. Rejected auto-approval before the deadline. After advancing only synthetic database timestamps, two service workers raced; exactly one committed `auto_approved`, with null actor ID plus `service` actor type in the decision and state histories.

Retained result: [`test-results/submission-store-junit.xml`](./test-results/submission-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety and later gates

All users, businesses, venues, media metadata, object keys, and timestamps are synthetic and remain on loopback PostgreSQL. No file bytes were uploaded, no creator content or device data was used, and no Azure, Stripe, identity-provider, payment, notification, or external operation occurred.

This checkpoint implements storage metadata and transactional validation, not the later M10 cloud direct-upload flow or M11 dispute/payment-resolution gate. Azure Blob upload intents, malware/media workers, size limits, retry/resume networking, content-license activation, disputes, creator payables, and physical-device media testing remain future work.
