import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import logger from './logger.js';
import { fakeAuth } from './src/middlewares/fakeAuth.js';

import { connectDB, disconnectDB } from './src/db.js';
import {
  connectKafkaProducer,
  disconnectKafkaProducer,
  isKafkaEnabled,
} from './src/services/kafkaProducer.js';
import {
  startKafkaConsumer,
  disconnectKafkaConsumer,
} from './src/services/kafkaConsumer.js';
// import your middlewares here
// import verifyToken from './src/middlewares/authMiddlewares.js';

// import your routes here
import aboutRoutes from './src/routes/aboutRoutes.js';
import healthRoutes from './src/routes/healthRoutes.js';
import messagingRoutes from './src/routes/messagingRoutes.js';
import friendshipRoutes from './src/routes/friendshipRoutes.js';
import feedRoutes from './src/routes/feedRoutes.js';
import ensureIndexes from './src/services/indexes.js';
import ensureKafkaTopics from './src/services/kafkaAdmin.js';

import { initSocket } from './src/services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(cors());

healthRoutes(app);
// add your middlewares here like this:
// app.use(verifyToken);
app.use(fakeAuth);

// add your routes here like this:
aboutRoutes(app);
friendshipRoutes(app);
feedRoutes(app);
// Export app for tests. Do not remove this line
export default app;

let server;

if (process.env.NODE_ENV !== 'test') {
  await connectDB();
  await ensureIndexes();

  // Crear servidor HTTP y enganchar Socket.IO
  server = http.createServer(app);
  const io = initSocket(server);

  // Rutas de mensajería
  messagingRoutes(app, io);

  if (isKafkaEnabled()) {
    logger.warn('Kafka is enabled, trying to connect producer and consumer');
    await ensureKafkaTopics(['social-events', 'social-dlq']);
    await connectKafkaProducer();
    await startKafkaConsumer();
  } else {
    logger.warn('Kafka is not enabled');
  }

  // IMPORTANTE: escuchar con server, no con app
  server.listen(PORT, () => {
    logger.warn(`Using log level: ${process.env.LOG_LEVEL}`);
    logger.info(`API running at http://localhost:${PORT}`);
    logger.info(`Health at http://localhost:${PORT}/api/v1/health`);
    logger.info(`API docs running at http://localhost:${PORT}/api/v1/docs/`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
} else {
  // En test: no levantamos socket real, pero montamos las rutas con un stub
  const ioStub = { to: () => ({ emit: () => {} }) };
  messagingRoutes(app, ioStub);
}

async function gracefulShutdown(signal) {
  logger.warn(`${signal} received. Starting secure shutdown...`);

  try {
    if (isKafkaEnabled()) {
      logger.warn('Disconnecting Kafka producer and consumer...');
      await disconnectKafkaProducer();
      await disconnectKafkaConsumer();
      logger.warn('Kafka producer and consumer disconnected.');
    }
  } catch (err) {
    logger.error('Error disconnecting Kafka:', err);
  }

  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      logger.info(
        'Since now new connections are not allowed. Waiting for current operations to finish...'
      );
      try {
        await disconnectDB();
        logger.info('MongoDB disconnected');
      } catch (err) {
        logger.error('Error disconnecting MongoDB:', err);
      }

      logger.info('Shutdown complete. Bye! ;)');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
