import { describe, it, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import * as service from '../../src/services/friendshipService.js';
import Friendship from '../../src/models/Friendship.js';

// helper mock response
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

describe('Validation and Input Errors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sendRequest -> 400 for invalid requester or recipient id', async () => {
    const req = {
      user: { sub: 'invalid-id' },
      body: { recipientId: 'also-invalid' },
    };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('sendRequest -> 400 when sending request to yourself', async () => {
    const id = '000000000000000000000000';
    const req = { user: { sub: id }, body: { recipientId: id } };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Cannot send request to yourself/);
  });

  it('sendRequest -> 404 when recipient not found', async () => {
    // mock users collection findOne -> null
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => null,
    });
    const alice = '000000000000000000000001';
    const bob = '000000000000000000000002';
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Recipient user not found/);
  });

  it('sendRequest -> 409 when users already friends (areFriends true)', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: '000000000000000000000002' }),
    });
    // simulate accepted friendship in DB -> areFriends will see it via Friendship.findOne
    vi.spyOn(Friendship, 'findOne').mockResolvedValue({
      _id: 'f1',
      status: 'accepted',
    });

    const alice = '000000000000000000000011';
    const bob = '000000000000000000000012';
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already friends/);
  });

  it('respondRequest -> 400 for invalid ids or invalid action', async () => {
    const res1 = makeRes();
    await service.respondRequest(
      {
        user: { sub: 'invalid' },
        params: { id: 'x' },
        body: { action: 'accept' },
      },
      res1
    );
    expect(res1.statusCode).toBe(400);

    const validId = '000000000000000000000030';
    const res2 = makeRes();
    await service.respondRequest(
      {
        user: { sub: validId },
        params: { id: validId },
        body: { action: 'invalid' },
      },
      res2
    );
    expect(res2.statusCode).toBe(400);
  });

  it('listReceived / listFriends / removeFriend -> 400 for invalid id', async () => {
    const resA = makeRes();
    await service.listReceived({ user: { sub: 'invalid' } }, resA);
    expect(resA.statusCode).toBe(400);

    const resB = makeRes();
    await service.listFriends({ user: { sub: 'invalid' } }, resB);
    expect(resB.statusCode).toBe(400);

    const resC = makeRes();
    await service.removeFriend(
      { user: { sub: 'invalid' }, params: { id: 'also-invalid' } },
      resC
    );
    expect(resC.statusCode).toBe(400);
  });
});

describe('Utilities & Basic Checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('areFriends -> true when accepted relation exists', async () => {
    const a = oid();
    const b = oid();
    vi.spyOn(Friendship, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      status: 'accepted',
    });

    const result = await service.areFriends(a, b);
    expect(result).toBe(true);
  });

  it('areFriends -> false when no accepted relation', async () => {
    const a = oid();
    const b = oid();
    vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);

    const result = await service.areFriends(a, b);
    expect(result).toBe(false);
  });

  it('sendRequest -> 400 for invalid requester or recipient id', async () => {
    const req = { user: { sub: 'bad-id' }, body: { recipientId: 'also-bad' } };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('sendRequest -> 400 when sending request to yourself', async () => {
    const id = oid();
    const req = { user: { sub: id }, body: { recipientId: id } };
    const res = makeRes();
    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/yourself/i);
  });

  it('sendRequest -> 404 when recipient not found', async () => {
    // users collection returns null
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => null,
    });

    const alice = oid();
    const bob = oid();
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();

    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Recipient/i);
  });

  it('sendRequest -> 409 when users already friends (accepted)', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });
    // accepted friendship exists
    vi.spyOn(Friendship, 'findOne').mockImplementation(async (query) => {
      if (
        query &&
        (query.status === 'accepted' ||
          (query.$or && query.$or.some((c) => c.status === 'accepted')))
      ) {
        return { _id: new mongoose.Types.ObjectId(), status: 'accepted' };
      }
      return null;
    });

    const alice = oid();
    const bob = oid();
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();

    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already friends/i);
  });

  it('sendRequest -> 409 for duplicate pending request', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });

    // Conditional: return null for accepted-check, return pending for existing check
    let callCount = 0;
    vi.spyOn(Friendship, 'findOne').mockImplementation(async (query) => {
      callCount += 1;
      if (
        query &&
        (query.status === 'accepted' ||
          (query.$or && query.$or.some((c) => c.status === 'accepted')))
      ) {
        return null;
      }
      // second call simulates existing pending
      if (callCount >= 2) return { status: 'pending' };
      return null;
    });

    const alice = oid();
    const bob = oid();
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();

    await service.sendRequest(req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/pending/i);
  });

  it('respondRequest -> 404 when friendship id not found', async () => {
    // findById returns null
    vi.spyOn(Friendship, 'findById').mockResolvedValue(null);

    const req = {
      user: { sub: oid() },
      params: { id: oid() },
      body: { action: 'accept' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);
    expect(res.statusCode).toBe(404);
  });
});

describe('Core Send/Respond Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sendRequest -> 201 creates new friendship request', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });
    // no accepted friendship, no existing pending
    vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);
    // mock save on instance to attach _id and return itself
    const createdId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(Friendship.prototype, 'save').mockImplementation(
      async function () {
        this._id = new mongoose.Types.ObjectId(createdId);
        return this;
      }
    );

    const alice = oid();
    const bob = oid();
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();

    await service.sendRequest(req, res);

    expect(res.statusCode).toBe(201);
    expect(String(res.body._id)).toBe(createdId);
    expect(String(res.body.requester)).toBe(alice);
    expect(String(res.body.recipient)).toBe(bob);
    expect(res.body.status).toBeDefined();
  });

  it('sendRequest -> 200 updates rejected -> pending when requester is same', async () => {
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });

    const requester = oid();
    const recipient = oid();
    const existing = {
      _id: new mongoose.Types.ObjectId(),
      requester: new mongoose.Types.ObjectId(requester),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'rejected',
      save: async function () {
        this.status = 'pending';
        return this;
      },
    };

    // first call in sendRequest checks accepted -> null, second finds existing rejected
    let calls = 0;
    vi.spyOn(Friendship, 'findOne').mockImplementation(async (query) => {
      calls += 1;
      if (calls === 1) return null; // accepted check
      return existing; // existing rejected
    });

    const req = { user: { sub: requester }, body: { recipientId: recipient } };
    const res = makeRes();

    await service.sendRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(String(res.body._id)).toBe(String(existing._id));
    expect(res.body.status).toBe('pending');
  });

  it('respondRequest -> 200 accept changes status to accepted', async () => {
    const id = oid();
    const recipient = oid();
    const doc = {
      _id: new mongoose.Types.ObjectId(id),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'pending',
      save: async function () {
        this.status = 'accepted';
        return this;
      },
    };
    vi.spyOn(Friendship, 'findById').mockResolvedValue(doc);

    const req = {
      user: { sub: recipient },
      params: { id },
      body: { action: 'accept' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  it('respondRequest -> 200 reject changes status to rejected', async () => {
    const id = oid();
    const recipient = oid();
    const doc = {
      _id: new mongoose.Types.ObjectId(id),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'pending',
      save: async function () {
        this.status = 'rejected';
        return this;
      },
    };
    vi.spyOn(Friendship, 'findById').mockResolvedValue(doc);

    const req = {
      user: { sub: recipient },
      params: { id },
      body: { action: 'reject' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('respondRequest -> 409 when friendship not pending', async () => {
    const id = oid();
    const recipient = oid();
    const doc = {
      _id: new mongoose.Types.ObjectId(id),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'accepted', // already accepted
      save: async function () {
        return this;
      },
    };
    vi.spyOn(Friendship, 'findById').mockResolvedValue(doc);

    const req = {
      user: { sub: recipient },
      params: { id },
      body: { action: 'accept' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);

    expect(res.statusCode).toBe(409);
  });

  it('listReceived -> 200 returns pending requests array (chainable find().sort())', async () => {
    const userId = oid();
    const pending = [
      {
        _id: new mongoose.Types.ObjectId(),
        requester: new mongoose.Types.ObjectId(),
        recipient: new mongoose.Types.ObjectId(userId),
        status: 'pending',
      },
    ];
    vi.spyOn(Friendship, 'find').mockImplementation(() => ({
      sort: () => pending,
    }));

    const req = { user: { sub: userId } };
    const res = makeRes();

    await service.listReceived(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('listFriends -> 200 returns friend ids', async () => {
    const userId = oid();
    const friends = [
      {
        requester: new mongoose.Types.ObjectId(userId),
        recipient: new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
        status: 'accepted',
      },
      {
        requester: new mongoose.Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
        recipient: new mongoose.Types.ObjectId(userId),
        status: 'accepted',
      },
    ];
    vi.spyOn(Friendship, 'find').mockResolvedValue(friends);

    const req = { user: { sub: userId } };
    const res = makeRes();

    await service.listFriends(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('friends');
    expect(Array.isArray(res.body.friends)).toBe(true);
    const mapped = res.body.friends.map((f) => String(f));
    expect(mapped.length).toBeGreaterThanOrEqual(1);
  });

  it('removeFriend -> 200 when removed, 404 when not found', async () => {
    const userId = oid();
    const otherId = oid();
    vi.spyOn(Friendship, 'findOneAndDelete').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
    });

    let req = { user: { sub: userId }, params: { id: otherId } };
    let res = makeRes();
    await service.removeFriend(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');

    vi.spyOn(Friendship, 'findOneAndDelete').mockResolvedValue(null);
    req = { user: { sub: userId }, params: { id: otherId } };
    res = makeRes();
    await service.removeFriend(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('handlers -> return 500 on DB errors (example: listFriends throws)', async () => {
    const userId = oid();
    vi.spyOn(Friendship, 'find').mockImplementation(() => {
      throw new Error('db fail');
    });

    const req = { user: { sub: userId } };
    const res = makeRes();

    await service.listFriends(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});

describe('Edge Cases & Authorization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sendRequest -> 200 accepts existing reverse pending request (B -> A)', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });

    const requester = oid();
    const recipient = oid();

    // simulate existing pending request in reverse direction (requester: recipient, recipient: requester)
    const existing = {
      _id: new mongoose.Types.ObjectId(),
      requester: new mongoose.Types.ObjectId(recipient),
      recipient: new mongoose.Types.ObjectId(requester),
      status: 'pending',
      save: async function () {
        this.status = 'accepted';
        return this;
      },
    };

    // Friendship.findOne: first call checks accepted (null), second returns reverse pending
    let calls = 0;
    vi.spyOn(Friendship, 'findOne').mockImplementation(async (query) => {
      calls += 1;
      if (calls === 1) return null; // accepted check
      return existing; // found reverse pending
    });

    const req = { user: { sub: requester }, body: { recipientId: recipient } };
    const res = makeRes();

    await service.sendRequest(req, res);

    // expected behavior: service accepts the reverse pending request
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'accepted');
  });

  it('sendRequest -> created document contains expected fields (createdAt, status, requester, recipient)', async () => {
    // recipient exists
    vi.spyOn(mongoose.connection, 'collection').mockReturnValue({
      findOne: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });

    // no existing relations
    vi.spyOn(Friendship, 'findOne').mockResolvedValue(null);

    // mock save to attach createdAt, _id and status
    const createdId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(Friendship.prototype, 'save').mockImplementation(
      async function () {
        this._id = new mongoose.Types.ObjectId(createdId);
        this.createdAt = new Date();
        this.status = this.status || 'pending';
        return this;
      }
    );

    const alice = oid();
    const bob = oid();
    const req = { user: { sub: alice }, body: { recipientId: bob } };
    const res = makeRes();

    await service.sendRequest(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('status', 'pending');
    // requester/recipient may be ObjectId instances or strings; compare string forms
    expect(String(res.body.requester)).toBe(alice);
    expect(String(res.body.recipient)).toBe(bob);
  });

  it('respondRequest -> 403 when actor is not the recipient', async () => {
    const id = oid();
    const recipient = oid();
    const friendshipDoc = {
      _id: new mongoose.Types.ObjectId(id),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'pending',
      save: async function () {
        return this;
      },
    };
    vi.spyOn(Friendship, 'findById').mockResolvedValue(friendshipDoc);

    const req = {
      user: { sub: oid() }, // different user, not the recipient
      params: { id },
      body: { action: 'accept' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('removeFriend -> 403 when user not authorized to remove (if service enforces auth)', async () => {
    const userId = oid();
    const otherId = oid();

    vi.spyOn(Friendship, 'findOneAndDelete').mockResolvedValue(null);

    const req = { user: { sub: userId }, params: { id: otherId } };
    const res = makeRes();

    await service.removeFriend(req, res);

    expect([403, 404]).toContain(res.statusCode);
  });

  it('consistency: ensure respondRequest returns 409 (conflict) when request already processed', async () => {
    const id = oid();
    const recipient = oid();
    const doc = {
      _id: new mongoose.Types.ObjectId(id),
      recipient: new mongoose.Types.ObjectId(recipient),
      status: 'accepted',
      save: async function () {
        return this;
      },
    };
    vi.spyOn(Friendship, 'findById').mockResolvedValue(doc);

    const req = {
      user: { sub: recipient },
      params: { id },
      body: { action: 'accept' },
    };
    const res = makeRes();

    await service.respondRequest(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('message');
  });
});
