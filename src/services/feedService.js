import mongoose from 'mongoose';
import Feed from '../models/Feed.js';

export const getFeed = async (req, res) => {
  const userId = req.query.userId || req.query.user || req.headers['x-user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return res.status(400).json({ message: 'Invalid or missing userId' });
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || '20', 10))
  );
  const page = Math.max(0, parseInt(req.query.page || '0', 10));
  const skip = page * limit;

  try {
    const items = await Feed.find({
      userId: mongoose.Types.ObjectId(String(userId)),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      items,
      meta: { limit, page, count: items.length },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};
