import { vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../main.js';
import { connectDB, disconnectDB } from '../../src/db.js';

beforeAll(async () => {
  // Avoid hitting a real database during unit tests; stub connection lifecycle.
  process.env.MONGOTESTURL =
    process.env.MONGOTESTURL || 'mongodb://127.0.0.1:27017/test';
  vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  vi.spyOn(mongoose, 'disconnect').mockResolvedValue();
  mongoose.connection.readyState = 1; // make health check report "connected"

  await connectDB();
});

afterAll(async () => {
  mongoose.connection.readyState = 0;
  await disconnectDB();
  vi.restoreAllMocks();
});

// Export a ready-to-use Supertest instance
export const api = request(app);
