import { buildApp } from './app.js';
import { getEnv } from './config/env.js';

async function start() {
  const env = getEnv();
  const app = await buildApp();

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}. Gracefully shutting down...`);
      try {
        await app.close();
        app.log.info('Palma Inventory Fastify server closed successfully');
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`🚀 Palma Inventory Backend running at ${address}`);
    app.log.info(`📚 Swagger OpenAPI documentation at ${address}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
