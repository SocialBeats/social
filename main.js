import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import logger from './logger.js';
import { connectDB } from './src/db.js';
import { fakeAuth } from './src/middlewares/fakeAuth.js';

// import your middlewares here
// import verifyToken from './src/middlewares/authMiddlewares.js';

// import your routes here
import aboutRoutes from './src/routes/aboutRoutes.js';
import healthRoutes from './src/routes/healthRoutes.js';
import messagingRoutes from './src/routes/messagingRoutes.js';
import friendshipRoutes from './src/routes/friendshipRoutes.js';

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

// Export app for tests. Do not remove this line
export default app;

if (process.env.NODE_ENV !== 'test') {
  await connectDB();

  // Crear servidor HTTP y enganchar Socket.IO
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  // Rutas de mensajería
  messagingRoutes(app, io);

  // IMPORTANTE: escuchar con httpServer, no con app
  httpServer.listen(PORT, () => {
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
