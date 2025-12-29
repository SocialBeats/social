import mongoose from 'mongoose';
import { Conversation, Message } from '../models/models.js';
import { areFriends } from '../services/friendshipService.js';
import { emitToUser } from '../services/socketService.js';

function makeMembersKey(a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return `${x}:${y}`;
}

export function makeMessagingController(io) {
  return {
    // POST /conversations/direct { otherUserId }
    async upsertDirectConversation(req, res) {
      const userId = req.userId;
      const { otherUserId } = req.body;

      if (!otherUserId || !mongoose.isValidObjectId(otherUserId)) {
        return res.status(400).json({ error: 'Invalid otherUserId' });
      }
      if (String(otherUserId) === String(userId)) {
        return res
          .status(400)
          .json({ error: 'Cannot create conversation with yourself' });
      }

      const ok = await areFriends(userId, otherUserId);
      if (!ok)
        return res.status(403).json({ error: 'You can only message friends' });

      const membersKey = makeMembersKey(userId, otherUserId);
      const members = [userId, otherUserId].sort();

      const convo = await Conversation.findOneAndUpdate(
        { type: 'direct', membersKey },
        { $setOnInsert: { type: 'direct', members, membersKey } },
        { upsert: true, new: true }
      );

      res.json({ conversation: convo });
    },

    // GET /conversations?cursor=&limit=
    async listConversations(req, res) {
      const userId = req.userId;
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

      const filter = { members: userId };

      // No listar conversaciones vacías (sin mensajes)
      if (cursor && !Number.isNaN(cursor.getTime())) {
        // Mantén también el "no null" cuando hay cursor
        filter.lastMessageAt = { $lt: cursor, $ne: null };
      } else {
        filter.lastMessageAt = { $ne: null };
      }

      const items = await Conversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = items.length > limit;
      const page = hasMore ? items.slice(0, limit) : items;

      const nextCursor = page.length
        ? page[page.length - 1].lastMessageAt
        : null;

      const mapped = page.map((c) => {
        const otherUserId = c.members.find((m) => String(m) !== String(userId));
        return { ...c, otherUserId };
      });

      res.json({ items: mapped, hasMore, nextCursor });
    },

    // GET /conversations/:id/messages?before=&limit=
    async listMessages(req, res) {
      const userId = req.userId;
      const { id: conversationId } = req.params;

      if (!mongoose.isValidObjectId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversationId' });
      }

      const convo = await Conversation.findById(conversationId).lean();
      if (!convo)
        return res.status(404).json({ error: 'Conversation not found' });
      if (!convo.members.some((m) => String(m) === String(userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const before = req.query.before ? new Date(req.query.before) : null;

      const filter = { conversationId };
      if (before && !Number.isNaN(before.getTime())) {
        filter.createdAt = { $lt: before };
      }

      const msgs = await Message.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = msgs.length > limit;
      const page = hasMore ? msgs.slice(0, limit) : msgs;

      // Devuelve en orden cronológico (antiguo->nuevo) para pintar fácil
      page.reverse();

      const nextCursor = page.length ? page[0].createdAt : null; // el más antiguo de esta página

      res.json({ items: page, hasMore, nextCursor });
    },

    // POST /conversations/:id/messages { text }
    async sendMessage(req, res) {
      const userId = req.userId;
      const { id: conversationId } = req.params;
      const { text } = req.body;

      if (!mongoose.isValidObjectId(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversationId' });
      }
      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text is required' });
      }
      if (text.length > 1000)
        return res.status(400).json({ error: 'Text too long (max 1000)' });

      const convo = await Conversation.findById(conversationId);
      if (!convo)
        return res.status(404).json({ error: 'Conversation not found' });
      if (!convo.members.some((m) => String(m) === String(userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const otherUserId = convo.members.find(
        (m) => String(m) !== String(userId)
      );
      const ok = await areFriends(userId, otherUserId);
      if (!ok)
        return res.status(403).json({ error: 'You can only message friends' });

      const msg = await Message.create({
        conversationId,
        senderId: userId,
        text: text.trim(),
      });

      convo.lastMessageAt = msg.createdAt;
      convo.lastMessageText = msg.text.slice(0, 200);
      await convo.save();

      // Push WS al receptor + al emisor (para reflejo)
      emitToUser(io, otherUserId, 'message:new', {
        conversationId,
        message: msg,
      });
      emitToUser(io, userId, 'message:new', { conversationId, message: msg });

      res.status(201).json({ message: msg });
    },
  };
}
