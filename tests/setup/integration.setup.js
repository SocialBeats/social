import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../main.js';
import { connectDB, disconnectDB } from '../../src/db.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

export const api = request(app);

export const withAuth = (req, userId) => {
  const id = userId || new mongoose.Types.ObjectId().toString();
  req.set('x-user-id', id);
  return req;
};
