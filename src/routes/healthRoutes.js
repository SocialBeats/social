import { getVersion } from '../utils/versionUtils.js';
import mongoose from 'mongoose';

export default function healthRoutes(app) {
  const version = getVersion();

  /**
   * @swagger
   * /api/v1/health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Health check endpoint
   *     description: Returns basic information to verify that the API is running properly.
   *     responses:
   *       200:
   *         description: API is healthy and responding.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 message:
   *                   type: string
   *                   example: Health check successful
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   *                 uptime:
   *                   type: number
   *                   example: 123.45
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-11-08T13:41:47.074Z"
   *                 environment:
   *                   type: string
   *                   example: "development"
   *                 db:
   *                   type: string
   *                   example: connected
   */
  app.get('/api/v1/health', (req, res) => {
    const dbStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({
      status: 'ok',
      message: 'Health check successful',
      version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      db: dbStatus,
    });
  });
}
