import { describe, it, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import * as service from '../../src/services/feedService.js';
import Feed from '../../src/models/Feed.js';

const makeRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const oid = () => new mongoose.Types.ObjectId().toString();

describe('Feed service - unit tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getFeed -> 400 when userId missing or invalid', async () => {
    const resA = makeRes();
    await service.getFeed({ query: {} }, resA);
    expect(resA.statusCode).toBe(400);

    const resB = makeRes();
    await service.getFeed({ query: { userId: 'bad-id' } }, resB);
    expect(resB.statusCode).toBe(400);
  });

  it('getFeed -> 200 returns items and meta (query userId)', async () => {
    const userId = oid();
    const items = [
      { _id: new mongoose.Types.ObjectId(), userId, title: 't1' },
      { _id: new mongoose.Types.ObjectId(), userId, title: 't2' },
    ];

    vi.spyOn(Feed, 'find').mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => items,
          }),
        }),
      }),
    });

    const req = { query: { userId, limit: '10', page: '0' } };
    const res = makeRes();

    await service.getFeed(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(items.length);
    expect(res.body.meta).toMatchObject({
      limit: 10,
      page: 0,
      count: items.length,
    });
  });

  it('getFeed -> 200 accepts user id from x-user-id header', async () => {
    const userId = oid();
    const items = [{ _id: new mongoose.Types.ObjectId(), userId, title: 't' }];

    vi.spyOn(Feed, 'find').mockReturnValue({
      sort: () => ({
        skip: () => ({ limit: () => ({ lean: async () => items }) }),
      }),
    });

    const req = { query: {}, headers: { 'x-user-id': userId } };
    const res = makeRes();

    await service.getFeed(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it('getFeed -> 500 when Feed.find throws', async () => {
    const userId = oid();
    vi.spyOn(Feed, 'find').mockImplementation(() => {
      throw new Error('db fail');
    });

    const req = { query: { userId } };
    const res = makeRes();

    await service.getFeed(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});
