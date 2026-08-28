import { workerIdentity } from './worker.js';

console.log(`${workerIdentity()} ready with synthetic adapters; no cloud queue connected.`);

const keepAlive = setInterval(() => undefined, 60_000);

const shutdown = (signal: string) => {
  clearInterval(keepAlive);
  console.log(`${workerIdentity()} received ${signal}; shutdown complete.`);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
