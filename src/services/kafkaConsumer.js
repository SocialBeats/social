import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import logger from '../../logger.js';
import Friendship from '../models/Friendship.js';
import Feed from '../models/Feed.js';
import { publishSocialEvent, isKafkaEnabled } from './kafkaProducer.js';
import { getFriendIds, asObjectId } from './friendHelper.js';

const kafka = new Kafka({
  clientId: 'social-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

// IMPORTANTE: Group ID diferente para que lleguen eventos a ambos servicios
const consumer = kafka.consumer({ groupId: 'social-group' });
const producer = kafka.producer();

const admin = kafka.admin();

async function publishFeedEventToFriends(eventType, actorId, payloadBuilder) {
  if (!isKafkaEnabled()) return;

  const friendIds = await getFriendIds(actorId);
  if (!friendIds.length) return;

  for (const friendId of friendIds) {
    const basePayload =
      typeof payloadBuilder === 'function'
        ? payloadBuilder(friendId)
        : payloadBuilder;

    await publishSocialEvent(eventType, {
      ...basePayload,
      actorId,
      targetUserId: friendId,
      userId: friendId,
    });
  }
}

async function upsertFeedItem({
  userId,
  type,
  entityId,
  actorId,
  beatId = null,
  friendId = null,
  commentId = null,
  title = null,
  text = null,
  thumbnailUrl = null,
  score = null,
  metadata = undefined,
}) {
  if (!userId || !type || !entityId || !actorId) return;

  await Feed.updateOne(
    { userId, type, entityId },
    {
      $setOnInsert: { createdAt: new Date() },
      $set: {
        actorId,
        beatId,
        friendId,
        commentId,
        title,
        text,
        thumbnailUrl,
        score,
        metadata,
      },
    },
    { upsert: true }
  );
}

/**
 * Processes incoming Kafka events
 * @param {Object} event - The event object with type and payload
 */
async function processEvent(event) {
  const data = event.payload;

  switch (event.type) {
    // Eventos de beats-interaction que nos interesan
    case 'COMMENT_CREATED': {
      logger.info(
        `Comment created on beat ${data.beatId} by user ${data.authorId}`
      );
      const actorId = data.authorId || data.userId;
      if (actorId) {
        await publishFeedEventToFriends('FEED_COMMENT_CREATED', actorId, {
          beatId: data.beatId,
          commentId: data._id,
          content: data.content,
          metadata: {
            actorUsername: data.authorName || data.authorUsername || null,
            beatTitle: data.beatTitle || null,
          },
        });
      }
      break;
    }

    case 'RATING_CREATED': {
      logger.info(
        `Rating created on beat ${data.beatId} by user ${data.userId}`
      );
      const actorId = data.userId;
      if (actorId) {
        await publishFeedEventToFriends('FEED_RATING_CREATED', actorId, {
          beatId: data.beatId,
          ratingId: data._id,
          score: data.score,
          metadata: {
            actorUsername: data.username || null,
            beatTitle: data.beatTitle || null,
          },
        });
      }
      break;
    }

    case 'PLAYLIST_CREATED':
      logger.info(`Playlist created: ${data.name} by user ${data.ownerId}`);
      // Aquí puedes agregar lógica adicional
      break;

    case 'PLAYLIST_UPDATED':
      logger.info(`Playlist updated: ${data._id}`);
      // Aquí puedes agregar lógica adicional
      break;

    case 'PLAYLIST_DELETED':
      logger.info(`Playlist deleted: ${data._id}`);
      // Aquí puedes agregar lógica adicional
      break;

    // Eventos de users que nos interesan
    case 'USER_CREATED':
      logger.info(`New user created: ${data.username} (${data._id})`);
      // Aquí puedes agregar lógica adicional
      break;

    case 'USER_UPDATED':
      logger.info(`User updated: ${data._id}`);
      // Aquí puedes agregar lógica adicional
      break;

    case 'USER_DELETED':
      logger.info(`User deleted: ${data._id}`);
      // Aquí puedes agregar lógica adicional:
      // - Eliminar amistades del usuario
      // - Limpiar mensajes
      // - Actualizar feeds
      break;

    // Eventos de beats que nos interesan
    case 'BEAT_CREATED': {
      logger.info(`New beat created: ${data.title} by ${data.artist}`);
      const actorId =
        data.artistId || data.ownerId || data.userId || data.authorId;
      if (actorId) {
        await publishFeedEventToFriends('FEED_BEAT_CREATED', actorId, {
          beatId: data._id,
          title: data.title,
          artist: data.artist,
          thumbnailUrl: data.coverUrl || data.thumbnailUrl || null,
          metadata: {
            beatTitle: data.title,
            artist: data.artist,
          },
        });
      }
      break;
    }

    case 'BEAT_UPDATED': {
      logger.info(`Beat updated: ${data._id}`);
      const actorId =
        data.artistId || data.ownerId || data.userId || data.authorId;
      if (actorId) {
        await publishFeedEventToFriends('FEED_BEAT_UPDATED', actorId, {
          beatId: data._id,
          title: data.title,
          artist: data.artist,
          thumbnailUrl: data.coverUrl || data.thumbnailUrl || null,
          metadata: {
            beatTitle: data.title,
            artist: data.artist,
          },
        });
      }
      break;
    }

    case 'BEAT_DELETED': {
      logger.info(`Beat deleted: ${data._id}`);
      const actorId =
        data.artistId || data.ownerId || data.userId || data.authorId;
      if (actorId) {
        await publishFeedEventToFriends('FEED_BEAT_DELETED', actorId, {
          beatId: data._id,
          title: data.title,
          artist: data.artist,
          metadata: {
            beatTitle: data.title,
            artist: data.artist,
          },
        });
      }
      break;
    }

    // Eventos internos del topic social-events para materializar el feed
    case 'FEED_FRIENDSHIP_ACCEPTED': {
      const targetUserId = asObjectId(event.payload?.targetUserId);
      const actorId = asObjectId(event.payload?.userA);
      const friendId = asObjectId(event.payload?.userB);
      if (!targetUserId || !actorId || !friendId) break;

      await upsertFeedItem({
        userId: targetUserId,
        type: 'friendship',
        entityId: String(event.payload.friendshipId),
        actorId,
        friendId,
        title: 'Nueva amistad',
        metadata: {
          userA: event.payload.userA,
          userB: event.payload.userB,
        },
      });
      break;
    }

    case 'FEED_BEAT_CREATED':
    case 'FEED_BEAT_UPDATED': {
      const targetUserId = asObjectId(event.payload?.targetUserId);
      const actorId = asObjectId(event.payload?.actorId);
      if (!targetUserId || !actorId) break;

      await upsertFeedItem({
        userId: targetUserId,
        type: 'beat',
        entityId: String(event.payload.beatId),
        actorId,
        beatId: asObjectId(event.payload.beatId),
        title: event.payload.title,
        thumbnailUrl: event.payload.thumbnailUrl,
        metadata: {
          artist: event.payload.artist,
          actorUsername: event.payload.metadata?.actorUsername,
          beatTitle: event.payload.metadata?.beatTitle || event.payload.title,
        },
      });
      break;
    }

    case 'FEED_BEAT_DELETED': {
      const targetUserId = asObjectId(event.payload?.targetUserId);
      if (!targetUserId) break;

      await Feed.deleteOne({
        userId: targetUserId,
        type: 'beat',
        entityId: String(event.payload?.beatId),
      });
      break;
    }

    case 'FEED_COMMENT_CREATED': {
      const targetUserId = asObjectId(event.payload?.targetUserId);
      const actorId = asObjectId(event.payload?.actorId);
      if (!targetUserId || !actorId) break;

      await upsertFeedItem({
        userId: targetUserId,
        type: 'comment',
        entityId: String(event.payload.commentId || event.payload._id),
        actorId,
        beatId: asObjectId(event.payload.beatId),
        commentId: asObjectId(event.payload.commentId || event.payload._id),
        text: event.payload.content,
        metadata: {
          beatId: event.payload.beatId,
          actorUsername: event.payload.metadata?.actorUsername,
          beatTitle: event.payload.metadata?.beatTitle,
        },
      });
      break;
    }

    case 'FEED_RATING_CREATED': {
      const targetUserId = asObjectId(event.payload?.targetUserId);
      const actorId = asObjectId(event.payload?.actorId);
      if (!targetUserId || !actorId) break;

      await upsertFeedItem({
        userId: targetUserId,
        type: 'rating',
        entityId: String(event.payload.ratingId || event.payload._id),
        actorId,
        beatId: asObjectId(event.payload.beatId),
        score: event.payload.score,
        metadata: {
          beatId: event.payload.beatId,
          actorUsername: event.payload.metadata?.actorUsername,
          beatTitle: event.payload.metadata?.beatTitle,
        },
      });
      break;
    }

    default:
      logger.warn(`⚠ Unknown event detected: ${event.type}`);
  }
}

/**
 * Sends failed events to Dead Letter Queue
 * @param {Object} event - The failed event
 * @param {string} reason - The error reason
 */
async function sendToDLQ(event, reason) {
  try {
    await producer.send({
      topic: 'social-dlq',
      messages: [
        {
          value: JSON.stringify({
            originalEvent: event,
            error: reason,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
    logger.warn(`Event sent to DLQ: ${event.type}, reason: ${reason}`);
  } catch (err) {
    logger.error('Failed to send event to DLQ:', err);
  }
}

/**
 * Starts the Kafka consumer with retry logic
 */
export async function startKafkaConsumer() {
  const MAX_RETRIES = Number(process.env.KAFKA_CONNECTION_MAX_RETRIES || 5);
  const RETRY_DELAY = Number(process.env.KAFKA_CONNECTION_RETRY_DELAY || 5000);
  const COOLDOWN_AFTER_FAIL = Number(process.env.KAFKA_COOLDOWN || 30000);

  let attempt = 1;

  while (true) {
    try {
      logger.info(
        `Connecting Kafka consumer... (Attempt ${attempt}/${MAX_RETRIES})`
      );
      await consumer.connect();

      // Suscribirse a los topics que nos interesan
      await consumer.subscribe({
        topic: 'beats-events',
        fromBeginning: false, // Solo eventos nuevos
      });
      await consumer.subscribe({
        topic: 'users-events',
        fromBeginning: false,
      });
      await consumer.subscribe({
        topic: 'beats-interaction-events',
        fromBeginning: false,
      });
      await consumer.subscribe({
        topic: 'social-events',
        fromBeginning: false,
      });

      logger.info('Kafka consumer connected & listening on social-group');

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            logger.verbose(`Received event from ${topic}: ${event.type}`);
            await processEvent(event);
          } catch (err) {
            logger.error(
              'Error processing message:',
              err,
              'Message:',
              message.value.toString()
            );
            await sendToDLQ(message.value.toString(), err.message);
          }
        },
      });

      attempt = 1;
      break;
    } catch (err) {
      logger.error(`Kafka consumer connection failed: ${err.message}`);

      if (attempt >= MAX_RETRIES) {
        logger.warn(
          `Max retries reached. Cooling down for ${COOLDOWN_AFTER_FAIL / 1000}s before trying again...`
        );
        await new Promise((res) => setTimeout(res, COOLDOWN_AFTER_FAIL));
        attempt = 1;
      } else {
        attempt++;
        logger.warn(`Retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise((res) => setTimeout(res, RETRY_DELAY));
      }
    }
  }
}

/**
 * Disconnects the Kafka consumer
 */
export async function disconnectKafkaConsumer() {
  try {
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  } catch (err) {
    logger.error('Error disconnecting Kafka consumer:', err);
  }
}

/**
 * Checks if Kafka is connected
 * @returns {Promise<boolean>}
 */
export async function isKafkaConnected() {
  try {
    await admin.connect();
    await admin.describeCluster();
    await admin.disconnect();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Checks if Kafka is enabled via environment variable
 * @returns {boolean}
 */
export function isKafkaEnabled() {
  return process.env.ENABLE_KAFKA?.toLowerCase() === 'true';
}

export { consumer, producer, processEvent };
