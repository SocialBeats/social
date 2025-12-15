import mongoose from 'mongoose';

export function fakeAuth(req, res, next) {
  const userId = req.header('x-user-id');
  if (!userId) return res.status(401).json({ error: 'Missing x-user-id' });
  if (!mongoose.isValidObjectId(userId))
    return res.status(400).json({ error: 'Invalid x-user-id' });

  req.userId = userId;
  next();
}
