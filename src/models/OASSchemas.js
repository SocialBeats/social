// src/models/OASSchemas.js

export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'Unauthorized' },
  },
  required: ['error'],
};

// Conversation según tu modelo Conversation (timestamps + versionKey false)
export const ConversationSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f345' },
    type: { type: 'string', enum: ['direct'], example: 'direct' },
    members: {
      type: 'array',
      items: { type: 'string' },
      example: ['64f0c2b9b3b2c1a0d1e2f111', '64f0c2b9b3b2c1a0d1e2f222'],
    },
    membersKey: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f111:64f0c2b9b3b2c1a0d1e2f222',
    },
    lastMessageAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2025-11-23T12:00:00.000Z',
    },
    lastMessageText: {
      type: 'string',
      example: 'Hola, ¿qué tal?',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T10:00:00.000Z',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T11:00:00.000Z',
    },
  },
  required: ['_id', 'type', 'members', 'membersKey', 'createdAt', 'updatedAt'],
  description:
    'Represents a direct conversation between exactly two users. Empty conversations (lastMessageAt null) are not returned by listConversations.',
};

// Item específico para listConversations: Conversation + otherUserId (propiedad derivada)
export const ConversationListItemSchema = {
  allOf: [
    { $ref: '#/components/schemas/Conversation' },
    {
      type: 'object',
      properties: {
        otherUserId: {
          type: 'string',
          example: '64f0c2b9b3b2c1a0d1e2f222',
          description:
            'Computed field: member id different from the authenticated user.',
        },
      },
      required: ['otherUserId'],
    },
  ],
};

// Message según tu modelo Message (timestamps + versionKey false)
export const MessageSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f999' },
    conversationId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f345',
    },
    senderId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f111',
    },
    text: {
      type: 'string',
      maxLength: 1000,
      example: '¿Vamos a jugar más tarde?',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T12:01:00.000Z',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T12:01:00.000Z',
    },
  },
  required: [
    '_id',
    'conversationId',
    'senderId',
    'text',
    'createdAt',
    'updatedAt',
  ],
  description:
    'Represents a message sent by a user within a conversation. Messages are returned chronologically (oldest to newest) in listMessages.',
};

// Response paginada para GET /api/v1/social/conversations
export const PaginatedConversationsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/ConversationListItem' },
    },
    hasMore: { type: 'boolean', example: true },
    nextCursor: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2025-11-23T12:00:00.000Z',
      description:
        'Cursor for next page. Use as `cursor` query param (lastMessageAt < cursor).',
    },
  },
  required: ['items', 'hasMore', 'nextCursor'],
};

// Response paginada para GET /api/v1/social/conversations/{id}/messages
export const PaginatedMessagesSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/Message' },
    },
    hasMore: { type: 'boolean', example: true },
    nextCursor: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2025-11-23T11:45:00.000Z',
      description:
        'Cursor for next page. Use as `before` query param (createdAt < before). This cursor is the oldest message date in the current page.',
    },
  },
  required: ['items', 'hasMore', 'nextCursor'],
};

// Request body para POST /conversations/direct
export const UpsertDirectConversationRequestSchema = {
  type: 'object',
  properties: {
    otherUserId: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f222' },
  },
  required: ['otherUserId'],
};

// Request body para POST /conversations/{id}/messages
export const SendMessageRequestSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', maxLength: 1000, example: 'Hola!' },
  },
  required: ['text'],
};
