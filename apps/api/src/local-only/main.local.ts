import 'reflect-metadata';

import { parseServerEnvironment } from '@local-missions/config';

import { createApiApplication } from '../create-application.js';
import { LocalAppModule } from './local-app.module.js';

const environment = parseServerEnvironment(process.env);
if (environment.APP_ENV !== 'local') {
  throw new Error('The local API entrypoint is forbidden outside APP_ENV=local.');
}

const host = '127.0.0.1';
const { app } = await createApiApplication(LocalAppModule);
await app.listen(environment.PORT, host);
process.stdout.write(
  `${JSON.stringify({ event: 'api_started', host, mode: 'local', port: environment.PORT, service: 'local-missions-api' })}\n`,
);
