import Feed from '../models/Feed.js';
import logger from '../../logger.js';

export async function ensureFeedIndexes() {
  try {
    logger.info('Ensuring Feed indexes (may rebuild)...');
    await Feed.syncIndexes();
    logger.info('Feed indexes are up to date.');
  } catch (err) {
    logger.error(
      'Failed to ensure Feed indexes. Check for duplicate keys.',
      err
    );
    throw err;
  }
}

export default async function ensureIndexes() {
  await ensureFeedIndexes();
}
