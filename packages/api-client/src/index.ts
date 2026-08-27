import createClient from 'openapi-fetch';

import type { paths } from './generated/schema.js';

export type LocalMissionsApiClient = ReturnType<typeof createClient<paths>>;

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

function assertSafeBaseUrl(value: string): string {
  const url = new URL(value);
  const isLocalHttp =
    url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('API base URL must use HTTPS except for localhost development.');
  }

  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function createLocalMissionsApiClient(options: ApiClientOptions): LocalMissionsApiClient {
  return createClient<paths>({
    baseUrl: assertSafeBaseUrl(options.baseUrl),
    fetch: options.fetch,
  });
}

export type { components, operations, paths } from './generated/schema.js';
