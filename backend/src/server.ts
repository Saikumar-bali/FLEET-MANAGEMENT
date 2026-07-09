import app from './app';
import { config } from './config';
import { initDatabase } from './config/database';

async function start() {
  try {
    await initDatabase();

    app.listen(config.port, () => {
      console.log(`Backend server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.VERCEL) {
  console.log('Running on Vercel — skipping app.listen()');
} else {
  start();
}
