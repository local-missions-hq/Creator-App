import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 3001);
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
  bufferLogs: true,
});

app.enableShutdownHooks();
await app.listen(port, host);
Logger.log(`Local Missions API listening on http://${host}:${port}`, 'Bootstrap');
