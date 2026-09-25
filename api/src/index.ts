import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Dhaka Tesla Pool API server listening on port ${PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} signal received: closing HTTP server and draining connections...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Prisma database connections closed gracefully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database disconnection');
      process.exit(1);
    }
  });

  // Force shutdown timeout if drain takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
