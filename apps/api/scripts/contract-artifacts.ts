import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import { AppModule } from '../src/app.module.js';
import { createApiApplication } from '../src/create-application.js';
import { LocalAppModule } from '../src/local-only/local-app.module.js';

const defaultDatabaseUrl =
  'postgresql://local_missions:local_missions_local_only@127.0.0.1:5432/local_missions';

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export async function buildContractArtifacts() {
  process.env.APP_ENV = 'local';
  process.env.DATABASE_URL ||= defaultDatabaseUrl;
  const quiet = () => undefined;
  const production = await createApiApplication(AppModule, { logSink: quiet });
  const local = await createApiApplication(LocalAppModule, { logSink: quiet });
  try {
    const productionDocument = sortValue(production.document);
    const localDocument = sortValue(local.document);
    const nodes = await openapiTS(productionDocument as Parameters<typeof openapiTS>[0], {
      alphabetize: true,
    });
    const clientPath = fileURLToPath(
      new URL('../../../packages/api-client/src/generated/schema.ts', import.meta.url),
    );
    const openApiPath = fileURLToPath(
      new URL('../../../docs/evidence/M03/api/openapi.json', import.meta.url),
    );
    const formatting = (await resolveConfig(clientPath)) ?? {};
    const [clientSchema, localOpenApi, productionOpenApi] = await Promise.all([
      format(`${COMMENT_HEADER}${astToString(nodes)}`, {
        ...formatting,
        filepath: clientPath,
      }),
      format(stableJson(localDocument), { ...formatting, filepath: openApiPath }),
      format(stableJson(productionDocument), { ...formatting, filepath: openApiPath }),
    ]);
    return { clientSchema, localOpenApi, productionOpenApi };
  } finally {
    await local.app.close();
    await production.app.close();
  }
}
