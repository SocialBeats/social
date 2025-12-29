import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';

beforeEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  // Avoid hitting a real database during unit tests; stub connection lifecycle.
  process.env.MONGOTESTURL =
    process.env.MONGOTESTURL || 'mongodb://127.0.0.1:27017/test';

  vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  vi.spyOn(mongoose, 'disconnect').mockResolvedValue();

  // Make health checks / code paths that read connection state behave deterministically.
  if (mongoose.connection) mongoose.connection.readyState = 1;
});

afterAll(() => {
  if (mongoose.connection) mongoose.connection.readyState = 0;
  vi.restoreAllMocks();
});
