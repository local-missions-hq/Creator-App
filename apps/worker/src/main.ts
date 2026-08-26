import { workerIdentity } from './worker.js';

console.log(`${workerIdentity()} ready with synthetic adapters; no cloud queue connected.`);

const shutdown = (signal: string) => {
  console.log(`${workerIdentity()} received ${signal}; shutdown complete.`);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
