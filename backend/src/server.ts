import app from './app';
import { config } from './config';
import { initDatabase } from './config/database';

async function start() {
  try {
    await initDatabase().catch((err) => {
      console.error('🚨 DATABASE INITIALIZATION ERROR: Database connection could not be established during startup:', err.message);
      console.warn('⚠️ Server is starting in DEGRADED mode. Static files and some health checks will still be available, but database queries will fail until the connection is established.');
    });

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Backend server running on http://0.0.0.0:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
