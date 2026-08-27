import { describe, expect, it } from 'vitest';

import { campaignStatusValues, initialSchemaTables } from './index.js';

describe('initial schema', () => {
  it('declares the first transactional campaign lifecycle tables', () => {
    expect(initialSchemaTables).toEqual([
      'users',
      'external_identities',
      'creator_profiles',
      'businesses',
      'business_memberships',
      'business_locations',
      'campaigns',
      'campaign_status_history',
      'mission_templates',
      'campaign_brief_versions',
      'deliverable_requirements',
      'mission_slots',
      'mission_applications',
      'slot_reservations',
      'mission_application_status_history',
      'mission_assignments',
      'mission_assignment_status_history',
      'venue_staff_assignments',
      'check_in_challenges',
      'check_in_events',
      'media_assets',
      'submission_attempts',
      'submission_assets',
      'submission_evidence',
      'submission_status_history',
      'correction_requests',
      'submission_review_decisions',
      'audit_events',
      'idempotency_records',
    ]);
  });

  it('exposes only the bounded first campaign states', () => {
    expect(campaignStatusValues).toEqual([
      'draft',
      'submitted',
      'approved',
      'funded',
      'published',
      'canceled',
    ]);
  });
});
