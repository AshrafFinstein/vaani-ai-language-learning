import { createApp } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  console.log(`🟣 Vaani API listening on http://localhost:${env.API_PORT}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
