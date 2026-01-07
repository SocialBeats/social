import { Router } from 'express';

import { fakeAuth } from '../middlewares/fakeAuth.js';
import { makeMessagingController } from '../controllers/messagingController.js';

export default function messagingRoutes(app, io) {
  const router = Router();
  const controller = makeMessagingController(io);

  // Aplica fakeAuth a todas las rutas de mensajería
  //router.use(fakeAuth);

  /**
   * @swagger
   * /api/v1/social/conversations/direct:
   *   post:
   *     tags:
   *       - Conversations
   *     summary: Create or get a direct conversation (upsert)
   *     description: >
   *       Creates a direct conversation with `otherUserId` if it does not exist, or returns the existing one.
   *       Temporary auth uses `x-user-id` header (dev). Future auth will use JWT bearer.
   *       `otherUserId` must be a valid MongoDB ObjectId and cannot be equal to the authenticated user.
   *     security:
   *       - xUserIdAuth: []
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpsertDirectConversationRequest'
   *     responses:
   *       200:
   *         description: Conversation successfully created or retrieved.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 conversation:
   *                   $ref: '#/components/schemas/Conversation'
   *       400:
   *         description: Invalid header or invalid input.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalidHeader:
   *                 value: { "error": "Invalid x-user-id" }
   *               invalidOtherUserId:
   *                 value: { "error": "Invalid otherUserId" }
   *               selfConversation:
   *                 value: { "error": "Cannot create conversation with yourself" }
   *       401:
   *         description: Unauthorized. Missing `x-user-id` header (dev) or missing/invalid token (future).
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingHeader:
   *                 value: { "error": "Missing x-user-id" }
   *       403:
   *         description: Forbidden. You can only message friends.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               notFriends:
   *                 value: { "error": "You can only message friends" }
   */
  router.post('/conversations/direct', controller.upsertDirectConversation);

  /**
   * @swagger
   * /api/v1/social/conversations:
   *   get:
   *     tags:
   *       - Conversations
   *     summary: List user conversations (cursor pagination)
   *     description: >
   *       Returns conversations for the authenticated user, ordered by `lastMessageAt` (desc) and `updatedAt` (desc).
   *       Empty conversations (without messages) are not returned.
   *       Pagination uses `cursor` (ISO date-time) applied to `lastMessageAt`.
   *     security:
   *       - xUserIdAuth: []
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: cursor
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Return conversations with `lastMessageAt` strictly less than this value.
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *         description: Max number of conversations to return (max 50).
   *     responses:
   *       200:
   *         description: Paginated list of conversations.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedConversations'
   *       400:
   *         description: Invalid `x-user-id` header value.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalidHeader:
   *                 value: { "error": "Invalid x-user-id" }
   *       401:
   *         description: Unauthorized. Missing `x-user-id` header (dev) or missing/invalid token (future).
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingHeader:
   *                 value: { "error": "Missing x-user-id" }
   */
  router.get('/conversations', controller.listConversations);

  /**
   * @swagger
   * /api/v1/social/conversations/{id}/messages:
   *   get:
   *     tags:
   *       - Messages
   *     summary: List messages in a conversation (backward pagination)
   *     description: >
   *       Returns messages for a conversation the authenticated user belongs to.
   *       Pagination uses `before` (ISO date-time) applied to `createdAt`.
   *       Messages are returned in chronological order (oldest to newest) for easier UI rendering.
   *     security:
   *       - xUserIdAuth: []
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Conversation ID (MongoDB ObjectId).
   *       - in: query
   *         name: before
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Return messages with `createdAt` strictly less than this value.
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 30
   *         description: Max number of messages to return (max 100).
   *     responses:
   *       200:
   *         description: Paginated list of messages.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedMessages'
   *       400:
   *         description: Invalid conversation id or invalid `x-user-id`.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalidConversationId:
   *                 value: { "error": "Invalid conversationId" }
   *               invalidHeader:
   *                 value: { "error": "Invalid x-user-id" }
   *       401:
   *         description: Unauthorized. Missing `x-user-id` header (dev) or missing/invalid token (future).
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingHeader:
   *                 value: { "error": "Missing x-user-id" }
   *       403:
   *         description: Forbidden. Authenticated user is not a member of the conversation.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               forbidden:
   *                 value: { "error": "Forbidden" }
   *       404:
   *         description: Conversation not found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               notFound:
   *                 value: { "error": "Conversation not found" }
   *
   *   post:
   *     tags:
   *       - Messages
   *     summary: Send a message to a conversation
   *     description: >
   *       Sends a new message in the specified conversation.
   *       The authenticated user must be a member of the conversation and must be friends with the other participant.
   *       `text` must be a non-empty string (trimmed) and max length is 1000 characters.
   *     security:
   *       - xUserIdAuth: []
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Conversation ID (MongoDB ObjectId).
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SendMessageRequest'
   *     responses:
   *       201:
   *         description: Message successfully created.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   $ref: '#/components/schemas/Message'
   *       400:
   *         description: Invalid conversation id, invalid header, or invalid message text.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               invalidConversationId:
   *                 value: { "error": "Invalid conversationId" }
   *               missingText:
   *                 value: { "error": "Text is required" }
   *               textTooLong:
   *                 value: { "error": "Text too long (max 1000)" }
   *               invalidHeader:
   *                 value: { "error": "Invalid x-user-id" }
   *       401:
   *         description: Unauthorized. Missing `x-user-id` header (dev) or missing/invalid token (future).
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               missingHeader:
   *                 value: { "error": "Missing x-user-id" }
   *       403:
   *         description: Forbidden. Not a member of the conversation or you can only message friends.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               forbidden:
   *                 value: { "error": "Forbidden" }
   *               notFriends:
   *                 value: { "error": "You can only message friends" }
   *       404:
   *         description: Conversation not found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               notFound:
   *                 value: { "error": "Conversation not found" }
   */
  router.get('/conversations/:id/messages', controller.listMessages);
  router.post('/conversations/:id/messages', controller.sendMessage);

  app.use('/api/v1', router);
}
