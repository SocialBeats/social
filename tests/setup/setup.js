import request from 'supertest';
import app from '../../main.js';
import { connectDB, disconnectDB } from '../../src/db.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

// Export a ready-to-use Supertest instance
export const api = request(app);
