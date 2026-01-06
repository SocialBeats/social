// src/models/OASSchemas.js

// Respuesta de error estándar de este micro (tu código usa { error: '...' })
export const ErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'Missing x-user-id' },
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

// Friendship (relación entre dos usuarios)
export const FriendshipSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f999' },
    requester: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f111',
      description: 'User who sent the request',
    },
    recipient: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f222',
      description: 'User who received the request',
    },
    status: {
      type: 'string',
      enum: ['pending', 'accepted', 'rejected'],
      example: 'pending',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: [
    '_id',
    'requester',
    'recipient',
    'status',
    'createdAt',
    'updatedAt',
  ],
  description: 'Friendship relation between two users.',
};

// Request body para POST /api/v1/friendships
export const FriendshipRequestSchema = {
  type: 'object',
  properties: {
    recipientId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f222',
    },
  },
  required: ['recipientId'],
};

// Request body para PATCH /api/v1/friendships/{id}/respond
export const FriendshipRespondRequestSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['accept', 'reject'],
      example: 'accept',
    },
  },
  required: ['action'],
};

// Friend summary en listados
export const FriendSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f222' },
    _id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f222' },
    username: { type: 'string', example: 'johndoe' },
    email: { type: 'string', example: 'john@example.com' },
  },
  required: ['id'],
};

// Response para GET /api/v1/friends
export const FriendsResponseSchema = {
  type: 'object',
  properties: {
    friends: {
      type: 'array',
      items: { $ref: '#/components/schemas/FriendSummary' },
    },
  },
  required: ['friends'],
};

// Feed item en el feed social
export const FeedItemSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', example: '64f0c2b9b3b2c1a0d1e2f888' },
    userId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f111',
      description: 'User who receives this feed item',
    },
    type: {
      type: 'string',
      enum: [
        'friendship',
        'FEED_COMMENT_CREATED',
        'FEED_RATING_CREATED',
        'FEED_BEAT_CREATED',
      ],
      example: 'friendship',
      description: 'Type of feed event',
    },
    entityId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f999',
      description: 'ID of the entity (beat, comment, rating, friendship)',
    },
    actorId: {
      type: 'string',
      example: '64f0c2b9b3b2c1a0d1e2f222',
      description: 'User who triggered the event',
    },
    beatId: {
      type: 'string',
      nullable: true,
      example: '64f0c2b9b3b2c1a0d1e2f333',
    },
    friendId: {
      type: 'string',
      nullable: true,
      example: '64f0c2b9b3b2c1a0d1e2f222',
    },
    commentId: {
      type: 'string',
      nullable: true,
      example: '64f0c2b9b3b2c1a0d1e2f444',
    },
    title: {
      type: 'string',
      nullable: true,
      example: 'New beat uploaded',
    },
    text: {
      type: 'string',
      nullable: true,
      example: 'Check out this new track!',
    },
    thumbnailUrl: {
      type: 'string',
      nullable: true,
      example: 'https://example.com/thumbnail.jpg',
    },
    score: {
      type: 'number',
      nullable: true,
      example: 4.5,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T12:00:00.000Z',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2025-11-23T12:00:00.000Z',
    },
  },
  required: [
    '_id',
    'userId',
    'type',
    'entityId',
    'actorId',
    'createdAt',
    'updatedAt',
  ],
  description: 'Social feed item representing an event in the network.',
};

// Response paginada para GET /api/v1/feed
export const PaginatedFeedSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/FeedItem' },
    },
    meta: {
      type: 'object',
      properties: {
        limit: { type: 'integer', example: 20 },
        page: { type: 'integer', example: 0 },
        count: { type: 'integer', example: 5 },
      },
    },
  },
  required: ['items', 'meta'],
};
