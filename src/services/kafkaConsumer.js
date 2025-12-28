import { Kafka } from 'kafkajs';
import logger from '../../logger.js';

const kafka = new Kafka({
  clientId: 'social-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

// IMPORTANTE: Group ID diferente para que lleguen eventos a ambos servicios
const consumer = kafka.consumer({ groupId: 'social-group' });
const producer = kafka.producer();

const admin = kafka.admin();

/**
 * Processes incoming Kafka events
 * @param {Object} event - The event object with type and payload
 */
async function processEvent(event) {
  const data = event.payload;

  switch (event.type) {
    // Eventos de beats-interaction que nos interesan
    case 'COMMENT_CREATED':
      logger.info(
        `Comment created on beat ${data.beatId} by user ${data.authorId}`
      );
      // Aquí puedes agregar lógica adicional, por ejemplo:
      // - Actualizar feed del usuario
      // - Notificar a amigos
      break;

    case 'RATING_CREATED':
      logger.info(
        `Rating created on beat ${data.beatId} by user ${data.userId}`
      );
      // Aquí puedes agregar lógica adicional
      break;

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
    case 'BEAT_CREATED':
      logger.info(`New beat created: ${data.title} by ${data.artist}`);
      // Aquí puedes agregar lógica adicional:
      // - Actualizar feed de amigos del artista
      // - Crear notificaciones
      break;

    case 'BEAT_UPDATED':
      logger.info(`Beat updated: ${data._id}`);
      // Aquí puedes agregar lógica adicional
      break;

    case 'BEAT_DELETED':
      logger.info(`Beat deleted: ${data._id}`);
      // Aquí puedes agregar lógica adicional
      break;

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
