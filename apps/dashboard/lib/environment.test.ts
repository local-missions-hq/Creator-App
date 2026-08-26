import { describe, expect, it } from 'vitest';

import { environmentLabel } from './environment';

describe('environmentLabel', () => {
  it('defaults safely to local', () => {
    expect(environmentLabel(undefined)).toBe('local');
  });

  it('uses an explicit environment', () => {
    expect(environmentLabel('staging')).toBe('staging');
  });
});
