import { buildApp } from './app.js';

async function start() {
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || '0.0.0.0';

  const app = await buildApp();

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}. Gracefully shutting down...`);
      try {
        await app.close();
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during discovery service shutdown');
        process.exit(1);
      }
    });
  }

  try {
    const address = await app.listen({ port, host });
    app.log.info(`🔍 Palma Inventory Discovery Engine running at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
