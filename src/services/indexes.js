import Feed from '../models/Feed.js';
import User from '../models/User.js';
import Beat from '../models/Beat.js';
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

export async function ensureUserIndexes() {
  try {
    logger.info('Ensuring User indexes (may rebuild)...');
    await User.syncIndexes();
    logger.info('User indexes are up to date.');
  } catch (err) {
    logger.error('Failed to ensure User indexes.', err);
    throw err;
  }
}

export async function ensureBeatIndexes() {
  try {
    logger.info('Ensuring Beat indexes (may rebuild)...');
    await Beat.syncIndexes();
    logger.info('Beat indexes are up to date.');
  } catch (err) {
    logger.error('Failed to ensure Beat indexes.', err);
    throw err;
  }
}

export default async function ensureIndexes() {
  await ensureFeedIndexes();
  await ensureUserIndexes();
  await ensureBeatIndexes();
}
