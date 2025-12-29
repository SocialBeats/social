import { Kafka } from 'kafkajs';
import logger from '../../logger.js';

const kafka = new Kafka({
  clientId: 'social-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
const admin = kafka.admin();

let isConnected = false;

/**
 * Connects the Kafka producer with retry logic
 */
export async function connectKafkaProducer() {
  const MAX_RETRIES = Number(process.env.KAFKA_CONNECTION_MAX_RETRIES || 5);
  const RETRY_DELAY = Number(process.env.KAFKA_CONNECTION_RETRY_DELAY || 5000);
  const COOLDOWN_AFTER_FAIL = Number(process.env.KAFKA_COOLDOWN || 30000);

  let attempt = 1;

  while (true) {
    try {
      logger.info(`Connecting to Kafka... (Attempt ${attempt}/${MAX_RETRIES})`);
      await producer.connect();
      isConnected = true;
      logger.info('Kafka producer connected successfully');
      break;
    } catch (err) {
      logger.error(`Kafka connection failed: ${err.message}`);

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
 * Disconnects the Kafka producer
 */
export async function disconnectKafkaProducer() {
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  } catch (err) {
    logger.error('Error disconnecting Kafka producer:', err);
  }
}

/**
 * Publishes a social event to the social-events topic
 * @param {string} eventType - Type of event (FRIENDSHIP_CREATED, FRIENDSHIP_ACCEPTED, FEED_ITEM_ADDED, etc.)
 * @param {Object} payload - Event payload data
 */
export async function publishSocialEvent(eventType, payload) {
  if (!isKafkaEnabled()) {
    logger.info(`Kafka disabled, skipping event: ${eventType}`);
    return;
  }

  if (!isConnected) {
    logger.warn(`Kafka not connected, skipping event: ${eventType}`);
    return;
  }

  try {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    // Derive a stable message key to maintain predictable partitioning
    // For FEED_* events, use targetUserId so each user's feed events are partitioned together
    let messageKey;
    if (payload && payload.targetUserId != null) {
      messageKey = payload.targetUserId.toString();
    } else if (payload && (payload._id != null || payload.userId != null)) {
      const identifier = payload._id ?? payload.userId;
      messageKey = identifier.toString();
    } else {
      messageKey = 'unknown-user';
      logger.warn(
        `publishSocialEvent called without user identifier for event type ${eventType}; using default Kafka key "${messageKey}".`
      );
    }

    await producer.send({
      topic: 'social-events',
      messages: [
        {
          key: messageKey,
          value: JSON.stringify(event),
        },
      ],
    });

    const userIdentifier = payload?._id ?? payload?.userId ?? 'unknown-user';
    logger.info(`Event published: ${eventType} for user ${userIdentifier}`);
  } catch (err) {
    logger.error(`Failed to publish event ${eventType}:`, err);
    // Don't throw - publishing failure shouldn't break the main operation
  }
}

/**
 * Checks if Kafka is currently reachable
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

export { producer };
