import { describe, expect, it } from 'vitest';

import { environmentLabel } from '../lib/environment';

describe('mobile shell environment', () => {
  it('defaults to a visible local label', () => {
    expect(environmentLabel(undefined)).toBe('local');
  });

  it('uses the configured label', () => {
    expect(environmentLabel('staging')).toBe('staging');
  });
});
