import fastify from 'fastify';
import { MonitoringEngine } from './collector/engine.js';

const app = fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

const PORT = Number(process.env.PORT) || 5050;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:4000';

const engine = new MonitoringEngine(BACKEND_URL);

let cycleCount = 0;
let lastCycleTime: string | null = null;
let lastCycleSamples = 0;
let isRunning = false;

// Health endpoint
app.get('/health', async () => ({
  status: 'healthy',
  service: 'palma-inventory-monitoring-worker',
  cycleCount,
  lastCycleTime,
  lastCycleSamples,
  timestamp: new Date().toISOString(),
}));

// Scheduler loop
async function runLoop() {
  if (isRunning) return;
  isRunning = true;

  try {
    const samplesCount = await engine.runMonitoringCycle();
    cycleCount++;
    lastCycleTime = new Date().toISOString();
    lastCycleSamples = samplesCount;
    app.log.info(`[Worker] Completed monitoring cycle #${cycleCount} with ${samplesCount} samples.`);
  } catch (err) {
    app.log.error(err, '[Worker] Error during monitoring cycle');
  } finally {
    isRunning = false;
  }
}

// Fetch interval from backend or default to 30s
async function getIntervalSec(): Promise<number> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/monitoring/config`);
    if (res.ok) {
      const json: any = await res.json();
      return json.data?.checkIntervalSec || 30;
    }
  } catch {}
  return 30;
}

let loopTimer: any = null;
async function scheduleNext() {
  const intervalSec = await getIntervalSec();
  loopTimer = setTimeout(async () => {
    await runLoop();
    scheduleNext();
  }, Math.max(10, intervalSec) * 1000);
}

async function start() {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`🚀 Monitoring Worker started on port ${PORT}`);

    // Run first cycle after 5 seconds to give backend time to warm up
    setTimeout(async () => {
      await runLoop();
      scheduleNext();
    }, 5000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
