import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// Mock de módulos (NOTA: factories hoisted, no usar variables externas)
vi.mock('../../src/models/models.js', () => {
  return {
    Conversation: {
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
    },
    Message: {
      find: vi.fn(),
      create: vi.fn(),
    },
  };
});

vi.mock('../../src/services/friendshipService.js', () => ({
  areFriends: vi.fn(),
}));

vi.mock('../../src/services/socketService.js', () => ({
  emitToUser: vi.fn(),
}));

import { makeMessagingController } from '../../src/controllers/messagingController.js';
import { Conversation, Message } from '../../src/models/models.js';
import { areFriends } from '../../src/services/friendshipService.js';
import { emitToUser } from '../../src/services/socketService.js';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function oid() {
  return new mongoose.Types.ObjectId().toString();
}

function makeLeanQuery(items) {
  return {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(items),
  };
}

describe('messagingController unit tests', () => {
  const ioStub = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertDirectConversation', () => {
    it('400 si otherUserId falta o es inválido', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();

      await controller.upsertDirectConversation(
        { userId: oid(), body: {} },
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid otherUserId' });

      vi.clearAllMocks();

      await controller.upsertDirectConversation(
        { userId: oid(), body: { otherUserId: 'not-an-oid' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid otherUserId' });
    });

    it('400 si se intenta crear conversación consigo mismo', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userId = oid();

      await controller.upsertDirectConversation(
        { userId, body: { otherUserId: userId } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot create conversation with yourself',
      });
    });

    it('403 si areFriends devuelve false', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userId = oid();
      const otherUserId = oid();

      vi.mocked(areFriends).mockResolvedValue(false);

      await controller.upsertDirectConversation(
        { userId, body: { otherUserId } },
        res
      );

      expect(areFriends).toHaveBeenCalledWith(userId, otherUserId);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You can only message friends',
      });
      expect(Conversation.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('happy path: upsert con membersKey estable (A,B) == (B,A) y responde con conversation', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userA = oid();
      const userB = oid();

      vi.mocked(areFriends).mockResolvedValue(true);

      const convoDoc = { _id: oid(), type: 'direct', members: [userA, userB] };
      vi.mocked(Conversation.findOneAndUpdate).mockResolvedValue(convoDoc);

      // A -> B
      await controller.upsertDirectConversation(
        { userId: userA, body: { otherUserId: userB } },
        res
      );

      expect(Conversation.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [filter1, update1, opts1] =
        Conversation.findOneAndUpdate.mock.calls[0];

      expect(filter1).toMatchObject({ type: 'direct' });
      expect(filter1.membersKey).toBeTruthy();
      expect(update1.$setOnInsert).toBeTruthy();
      expect(opts1).toMatchObject({ upsert: true, new: true });

      expect(res.json).toHaveBeenCalledWith({ conversation: convoDoc });

      vi.clearAllMocks();
      vi.mocked(areFriends).mockResolvedValue(true);
      vi.mocked(Conversation.findOneAndUpdate).mockResolvedValue(convoDoc);

      // B -> A
      await controller.upsertDirectConversation(
        { userId: userB, body: { otherUserId: userA } },
        res
      );

      const [filter2] = Conversation.findOneAndUpdate.mock.calls[0];
      expect(filter2.membersKey).toBe(filter1.membersKey);
    });
  });

  describe('listConversations', () => {
    it('sin cursor o cursor inválido: filtra lastMessageAt != null y mapea otherUserId', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userId = oid();
      const otherUserId = oid();

      const conversations = [
        {
          _id: oid(),
          members: [userId, otherUserId],
          lastMessageAt: new Date('2025-01-01T10:00:00.000Z'),
          updatedAt: new Date('2025-01-01T10:00:00.000Z'),
        },
      ];

      vi.mocked(Conversation.find).mockReturnValue(
        makeLeanQuery(conversations)
      );

      await controller.listConversations(
        { userId, query: { cursor: 'not-a-date' } },
        res
      );

      expect(Conversation.find).toHaveBeenCalledTimes(1);
      const filter = Conversation.find.mock.calls[0][0];
      expect(filter).toMatchObject({ members: userId });
      expect(filter.lastMessageAt).toMatchObject({ $ne: null });

      const body = res.json.mock.calls[0][0];
      expect(body.items).toHaveLength(1);
      expect(body.items[0].otherUserId).toBe(otherUserId);
      expect(body.hasMore).toBe(false);
      expect(body.nextCursor).toBe(conversations[0].lastMessageAt);
    });

    it('con cursor válido: filtra lastMessageAt < cursor y != null; aplica límite y hasMore', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userId = oid();
      const other1 = oid();
      const other2 = oid();

      const limit = 1;
      const cursor = new Date('2025-02-01T00:00:00.000Z');

      const conversations = [
        {
          _id: oid(),
          members: [userId, other1],
          lastMessageAt: new Date('2025-01-10T00:00:00.000Z'),
        },
        {
          _id: oid(),
          members: [userId, other2],
          lastMessageAt: new Date('2025-01-09T00:00:00.000Z'),
        },
      ];

      vi.mocked(Conversation.find).mockReturnValue(
        makeLeanQuery(conversations)
      );

      await controller.listConversations(
        {
          userId,
          query: { limit: String(limit), cursor: cursor.toISOString() },
        },
        res
      );

      const filter = Conversation.find.mock.calls[0][0];
      expect(filter.lastMessageAt.$lt.toISOString()).toBe(cursor.toISOString());
      expect(filter.lastMessageAt.$ne).toBe(null);

      const body = res.json.mock.calls[0][0];
      expect(body.items).toHaveLength(1);
      expect(body.hasMore).toBe(true);
      expect(body.nextCursor).toBe(conversations[0].lastMessageAt);
    });

    it('cap de limit a 50', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const userId = oid();

      const q = makeLeanQuery([]);
      vi.mocked(Conversation.find).mockReturnValue(q);

      await controller.listConversations(
        { userId, query: { limit: '999' } },
        res
      );

      expect(q.limit).toHaveBeenCalledWith(51);
    });
  });
  describe('listMessages', () => {
    it('400 si conversationId inválido', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();

      await controller.listMessages(
        { userId: oid(), params: { id: 'bad' }, query: {} },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid conversationId',
      });
    });

    it('404 si conversación no existe', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();

      vi.mocked(Conversation.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await controller.listMessages(
        { userId: oid(), params: { id: conversationId }, query: {} },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found',
      });
    });

    it('403 si usuario no es miembro', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      vi.mocked(Conversation.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: conversationId,
          members: [oid(), oid()],
        }),
      });

      await controller.listMessages(
        { userId, params: { id: conversationId }, query: {} },
        res
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    // ✅ ESTE TEST ES EL QUE TE FALTABA PARA CUBRIR LA RAMA "before no existe"
    it('sin before: no añade filtro createdAt', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      vi.mocked(Conversation.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: conversationId,
          members: [userId, oid()],
        }),
      });

      vi.mocked(Message.find).mockReturnValue(makeLeanQuery([]));

      // query SIN before (rama que faltaba)
      await controller.listMessages(
        { userId, params: { id: conversationId }, query: {} },
        res
      );

      const filter = Message.find.mock.calls[0][0];
      expect(filter).toEqual({ conversationId });
    });

    it('happy path: aplica before si es válido; pagina y devuelve en orden cronológico con nextCursor', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      vi.mocked(Conversation.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: conversationId,
          members: [userId, oid()],
        }),
      });

      const limit = 2;
      const before = new Date('2025-03-01T00:00:00.000Z');

      const m1 = {
        _id: oid(),
        createdAt: new Date('2025-02-10T10:00:00.000Z'),
        text: 'newest',
      };
      const m2 = {
        _id: oid(),
        createdAt: new Date('2025-02-10T09:00:00.000Z'),
        text: 'mid',
      };
      const m3 = {
        _id: oid(),
        createdAt: new Date('2025-02-10T08:00:00.000Z'),
        text: 'old',
      };

      vi.mocked(Message.find).mockReturnValue(makeLeanQuery([m1, m2, m3]));

      await controller.listMessages(
        {
          userId,
          params: { id: conversationId },
          query: { limit: String(limit), before: before.toISOString() },
        },
        res
      );

      const filter = Message.find.mock.calls[0][0];
      expect(filter).toMatchObject({ conversationId });
      expect(filter.createdAt.$lt.toISOString()).toBe(before.toISOString());

      const body = res.json.mock.calls[0][0];
      expect(body.hasMore).toBe(true);
      expect(body.items.map((x) => x.text)).toEqual(['mid', 'newest']);
      expect(body.nextCursor.toISOString()).toBe(m2.createdAt.toISOString());
    });

    it('before inválido: no añade filtro createdAt', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      vi.mocked(Conversation.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: conversationId,
          members: [userId, oid()],
        }),
      });

      vi.mocked(Message.find).mockReturnValue(makeLeanQuery([]));

      await controller.listMessages(
        { userId, params: { id: conversationId }, query: { before: 'nope' } },
        res
      );

      const filter = Message.find.mock.calls[0][0];
      expect(filter).toEqual({ conversationId });
    });
  });

  describe('sendMessage', () => {
    it('400 si conversationId inválido', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();

      await controller.sendMessage(
        { userId: oid(), params: { id: 'bad' }, body: { text: 'hi' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid conversationId',
      });
    });

    it('400 si text no es string o está vacío', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      await controller.sendMessage(
        { userId, params: { id: conversationId }, body: { text: 123 } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Text is required' });

      vi.clearAllMocks();

      await controller.sendMessage(
        { userId, params: { id: conversationId }, body: { text: '   ' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('400 si text supera 1000', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      await controller.sendMessage(
        {
          userId,
          params: { id: conversationId },
          body: { text: 'a'.repeat(1001) },
        },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Text too long (max 1000)',
      });
    });

    it('404 si conversación no existe', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();

      vi.mocked(Conversation.findById).mockResolvedValue(null);

      await controller.sendMessage(
        {
          userId: oid(),
          params: { id: conversationId },
          body: { text: 'hello' },
        },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Conversation not found',
      });
    });

    it('403 si usuario no es miembro', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();

      vi.mocked(Conversation.findById).mockResolvedValue({
        _id: conversationId,
        members: [oid(), oid()],
        save: vi.fn(),
      });

      await controller.sendMessage(
        { userId, params: { id: conversationId }, body: { text: 'hello' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('403 si areFriends devuelve false', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();
      const otherUserId = oid();

      vi.mocked(Conversation.findById).mockResolvedValue({
        _id: conversationId,
        members: [userId, otherUserId],
        save: vi.fn(),
      });

      vi.mocked(areFriends).mockResolvedValue(false);

      await controller.sendMessage(
        { userId, params: { id: conversationId }, body: { text: 'hello' } },
        res
      );

      expect(areFriends).toHaveBeenCalledWith(userId, otherUserId);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You can only message friends',
      });
      expect(Message.create).not.toHaveBeenCalled();
      expect(emitToUser).not.toHaveBeenCalled();
    });

    it('happy path: crea mensaje, actualiza convo, emite a receptor y emisor, responde 201', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();
      const otherUserId = oid();

      const convoDoc = {
        _id: conversationId,
        members: [userId, otherUserId],
        save: vi.fn().mockResolvedValue(undefined),
        lastMessageAt: null,
        lastMessageText: '',
      };

      vi.mocked(Conversation.findById).mockResolvedValue(convoDoc);
      vi.mocked(areFriends).mockResolvedValue(true);

      const createdAt = new Date('2025-04-01T12:00:00.000Z');
      const msgDoc = {
        _id: oid(),
        conversationId,
        senderId: userId,
        text: 'hello trimmed',
        createdAt,
      };

      vi.mocked(Message.create).mockResolvedValue(msgDoc);

      await controller.sendMessage(
        {
          userId,
          params: { id: conversationId },
          body: { text: '  hello trimmed  ' },
        },
        res
      );

      expect(Message.create).toHaveBeenCalledWith({
        conversationId,
        senderId: userId,
        text: 'hello trimmed',
      });

      expect(convoDoc.lastMessageAt.toISOString()).toBe(
        createdAt.toISOString()
      );
      expect(convoDoc.lastMessageText).toBe('hello trimmed');
      expect(convoDoc.save).toHaveBeenCalledTimes(1);

      expect(emitToUser).toHaveBeenCalledTimes(2);
      expect(emitToUser).toHaveBeenNthCalledWith(
        1,
        ioStub,
        otherUserId,
        'message:new',
        { conversationId, message: msgDoc }
      );
      expect(emitToUser).toHaveBeenNthCalledWith(
        2,
        ioStub,
        userId,
        'message:new',
        { conversationId, message: msgDoc }
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: msgDoc });
    });

    it('happy path: lastMessageText recorta a 200 chars', async () => {
      const controller = makeMessagingController(ioStub);
      const res = makeRes();
      const conversationId = oid();
      const userId = oid();
      const otherUserId = oid();

      const convoDoc = {
        _id: conversationId,
        members: [userId, otherUserId],
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(Conversation.findById).mockResolvedValue(convoDoc);
      vi.mocked(areFriends).mockResolvedValue(true);

      const longText = 'a'.repeat(250);
      const msgDoc = {
        _id: oid(),
        conversationId,
        senderId: userId,
        text: longText,
        createdAt: new Date(),
      };

      vi.mocked(Message.create).mockResolvedValue(msgDoc);

      await controller.sendMessage(
        { userId, params: { id: conversationId }, body: { text: longText } },
        res
      );

      expect(convoDoc.lastMessageText.length).toBe(200);
    });
  });
});
