import { describe, expect, it } from 'vitest';

import { parseServerEnvironment } from './index.js';

describe('parseServerEnvironment', () => {
  it('parses local synthetic configuration', () => {
    expect(
      parseServerEnvironment({
        APP_ENV: 'local',
        DATABASE_URL: 'postgresql://local_missions:local@127.0.0.1:5432/local_missions',
        PORT: '4000',
      }),
    ).toMatchObject({ APP_ENV: 'local', PORT: 4000 });
  });

  it('fails closed when the database URL is missing', () => {
    expect(() => parseServerEnvironment({ APP_ENV: 'local' })).toThrow();
  });
});
