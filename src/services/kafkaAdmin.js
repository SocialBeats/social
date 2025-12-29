import { Kafka } from 'kafkajs';
import logger from '../../logger.js';

function buildKafka() {
  return new Kafka({
    clientId: 'social-service-admin',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });
}

export async function ensureKafkaTopics(topics = []) {
  if (!topics.length) return;
  const kafka = buildKafka();
  const admin = kafka.admin();

  try {
    await admin.connect();
    logger.info(`Ensuring Kafka topics exist: ${topics.join(', ')}`);
    await admin.createTopics({
      topics: topics.map((t) => ({ topic: t, numPartitions: 1 })),
      waitForLeaders: true,
    });
    logger.info('Kafka topics ensured.');
  } catch (err) {
    logger.error('Failed ensuring Kafka topics', err);
    throw err;
  } finally {
    await admin.disconnect();
  }
}

export default ensureKafkaTopics;
