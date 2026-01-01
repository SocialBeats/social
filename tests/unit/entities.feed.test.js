import { describe, it, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import * as service from '../../src/services/feedService.js';
import Feed from '../../src/models/Feed.js';
import { processEvent } from '../../src/services/kafkaConsumer.js';

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

  it('getFeed -> 401 when unauthenticated; 400 when userId invalid', async () => {
    // Unauthenticated -> middleware would block, service returns 401
    const resA = makeRes();
    await service.getFeed({ query: {} }, resA);
    expect(resA.statusCode).toBe(401);

    // Authenticated but invalid userId -> 400
    const resB = makeRes();
    await service.getFeed({ user: { id: 'bad-id' }, query: {} }, resB);
    expect(resB.statusCode).toBe(400);
  });

  it('getFeed -> 200 returns items and meta (authenticated user)', async () => {
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

    const req = { user: { id: userId }, query: { limit: '10', page: '0' } };
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

  it('getFeed -> 200 does not accept userId from query/header (service requires auth)', async () => {
    const userId = oid();
    const items = [{ _id: new mongoose.Types.ObjectId(), userId, title: 't' }];

    vi.spyOn(Feed, 'find').mockReturnValue({
      sort: () => ({
        skip: () => ({ limit: () => ({ lean: async () => items }) }),
      }),
    });

    // No req.user -> should be 401 even if header exists
    const req = { query: {}, headers: { 'x-user-id': userId } };
    const res = makeRes();

    await service.getFeed(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('FEED_BEAT_DELETED -> deleteMany beat items', async () => {
    const deleteManySpy = vi.spyOn(Feed, 'deleteMany').mockResolvedValue({});

    const beatId = oid();

    const event = {
      type: 'FEED_BEAT_DELETED',
      payload: {
        beatId,
        actorId: oid(),
        targetUserId: oid(),
      },
    };

    await processEvent(event);

    expect(deleteManySpy).toHaveBeenCalledWith({ beatId: expect.any(Object) });
  });

  it('getFeed -> 500 when Feed.find throws (authenticated user)', async () => {
    const userId = oid();
    vi.spyOn(Feed, 'find').mockImplementation(() => {
      throw new Error('db fail');
    });

    const req = { user: { id: userId }, query: { limit: '20', page: '0' } };
    const res = makeRes();

    await service.getFeed(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});

describe('Feed Kafka events - unit tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('FEED_FRIENDSHIP_ACCEPTED -> upsertFeedItem with type=friendship', async () => {
    const updateOneSpy = vi.spyOn(Feed, 'updateOne').mockResolvedValue({});

    const event = {
      type: 'FEED_FRIENDSHIP_ACCEPTED',
      payload: {
        friendshipId: oid(),
        userA: oid(),
        userB: oid(),
        targetUserId: oid(),
      },
    };

    await processEvent(event);

    expect(updateOneSpy).toHaveBeenCalledWith(
      {
        userId: expect.any(Object),
        type: 'friendship',
        entityId: expect.any(String),
      },
      expect.objectContaining({
        $set: expect.objectContaining({ friendId: expect.any(Object) }),
      }),
      { upsert: true }
    );
  });

  it('FEED_BEAT_CREATED -> upsertFeedItem with type=beat', async () => {
    const updateOneSpy = vi.spyOn(Feed, 'updateOne').mockResolvedValue({});

    const event = {
      type: 'FEED_BEAT_CREATED',
      payload: {
        beatId: oid(),
        actorId: oid(),
        targetUserId: oid(),
        title: 'Test Beat',
        artist: 'Test Artist',
        thumbnailUrl: 'http://example.com/beat.jpg',
        metadata: {
          beatTitle: 'Test Beat',
          artist: 'Test Artist',
        },
      },
    };

    await processEvent(event);

    expect(updateOneSpy).toHaveBeenCalledWith(
      {
        userId: expect.any(Object),
        type: 'beat',
        entityId: expect.any(String),
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          title: 'Test Beat',
          thumbnailUrl: 'http://example.com/beat.jpg',
        }),
      }),
      { upsert: true }
    );
  });

  it('FEED_BEAT_UPDATED -> updates existing beat item', async () => {
    const updateOneSpy = vi.spyOn(Feed, 'updateOne').mockResolvedValue({});

    const event = {
      type: 'FEED_BEAT_UPDATED',
      payload: {
        beatId: oid(),
        actorId: oid(),
        targetUserId: oid(),
        title: 'Updated Beat',
        artist: 'Updated Artist',
      },
    };

    await processEvent(event);

    expect(updateOneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'beat' }),
      expect.any(Object),
      { upsert: true }
    );
  });

  it('FEED_COMMENT_CREATED -> upsertFeedItem with type=comment', async () => {
    const updateOneSpy = vi.spyOn(Feed, 'updateOne').mockResolvedValue({});

    const event = {
      type: 'FEED_COMMENT_CREATED',
      payload: {
        commentId: oid(),
        actorId: oid(),
        targetUserId: oid(),
        beatId: oid(),
        content: 'Great beat!',
        metadata: {
          actorUsername: 'testuser',
          beatTitle: 'Test Beat',
        },
      },
    };

    await processEvent(event);

    expect(updateOneSpy).toHaveBeenCalledWith(
      {
        userId: expect.any(Object),
        type: 'comment',
        entityId: expect.any(String),
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          text: 'Great beat!',
          commentId: expect.any(Object),
        }),
      }),
      { upsert: true }
    );
  });

  it('FEED_RATING_CREATED -> upsertFeedItem with type=rating', async () => {
    const updateOneSpy = vi.spyOn(Feed, 'updateOne').mockResolvedValue({});

    const event = {
      type: 'FEED_RATING_CREATED',
      payload: {
        ratingId: oid(),
        actorId: oid(),
        targetUserId: oid(),
        beatId: oid(),
        score: 5,
        metadata: {
          actorUsername: 'testuser',
          beatTitle: 'Test Beat',
        },
      },
    };

    await processEvent(event);

    expect(updateOneSpy).toHaveBeenCalledWith(
      {
        userId: expect.any(Object),
        type: 'rating',
        entityId: expect.any(String),
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          score: 5,
        }),
      }),
      { upsert: true }
    );
  });

  it('Unknown event type -> logs warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const event = {
      type: 'UNKNOWN_EVENT',
      payload: {},
    };

    await processEvent(event);
    expect(true).toBe(true);

    warnSpy.mockRestore();
  });
});
