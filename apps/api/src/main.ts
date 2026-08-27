import 'reflect-metadata';

import { parseServerEnvironment } from '@local-missions/config';

import { AppModule } from './app.module.js';
import { createApiApplication } from './create-application.js';

const environment = parseServerEnvironment(process.env);
const host = environment.APP_ENV === 'local' ? '127.0.0.1' : '0.0.0.0';
const { app } = await createApiApplication(AppModule);

await app.listen(environment.PORT, host);
process.stdout.write(
  `${JSON.stringify({ event: 'api_started', host, port: environment.PORT, service: 'local-missions-api' })}\n`,
);
