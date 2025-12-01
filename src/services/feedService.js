import mongoose from 'mongoose';
import Feed from '../models/Feed.js';
import logger from '../../logger.js';

export const getFeed = async (req, res) => {
  const userId =
    req?.query?.userId || req?.query?.user || req?.headers?.['x-user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return res.status(400).json({ message: 'Invalid or missing userId' });
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(req?.query?.limit || '20', 10))
  );
  const page = Math.max(0, parseInt(req?.query?.page || '0', 10));
  const skip = page * limit;

  try {
    let step = Feed.find({
      userId: new mongoose.Types.ObjectId(String(userId)),
    });

    if (step && typeof step.sort === 'function') {
      step = step.sort({ createdAt: -1 });
    }

    if (step && typeof step.skip === 'function') {
      step = step.skip(skip);
    }

    if (step && typeof step.limit === 'function') {
      step = step.limit(limit);
    }

    let items;
    if (step && typeof step.lean === 'function') {
      items = await step.lean();
    } else if (step && typeof step.exec === 'function') {
      items = await step.exec();
    } else if (step && typeof step.then === 'function') {
      items = await step;
    } else {
      try {
        items = await (typeof step === 'function' ? step() : step);
      } catch {
        items = [];
      }
    }

    return res.status(200).json({
      items: items || [],
      meta: { limit, page, count: (items && items.length) || 0 },
    });
  } catch (err) {
    logger.error(`getFeed error: ${err?.message || err}`);
    logger.error(err?.stack || '');
    return res.status(500).json({ message: 'Server error' });
  }
};
