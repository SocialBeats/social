import jwt from 'jsonwebtoken';
import logger from '../../logger.js';
import mongoose from 'mongoose';

const openPaths = [
  '/api/v1/docs/',
  '/api/v1/health',
  '/api/v1/about',
  '/api/v1/changelog',
  '/api/v1/version',
];

// Middleware that extracts user from x-user-id header
export const extractUserFromHeader = (req, res, next) => {
  if (openPaths.some((path) => req.path.startsWith(path))) {
    return next();
  } else if (!req.path.startsWith('/api/v')) {
    return res
      .status(400)
      .json({ message: 'You must specify the API version, e.g. /api/v1/...' });
  }

  const userId = req.headers['x-user-id'];

  if (!userId) {
    logger.warn(`Unauthenticated request to ${req.path}`);
    return res.status(401).json({ message: 'Missing x-user-id header' });
  }

  // Validate that userId is a valid ObjectId (24 hex characters)
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    logger.warn(`Invalid x-user-id format: ${userId}`);
    return res.status(401).json({ message: 'Invalid x-user-id format' });
  }

  req.user = { sub: userId };
  next();
};

// Legacy JWT verification middleware
const verifyToken = (req, res, next) => {
  if (openPaths.some((path) => req.path.startsWith(path))) {
    return next();
  } else if (!req.path.startsWith('/api/v')) {
    return res
      .status(400)
      .json({ message: 'You must specify the API version, e.g. /api/v1/...' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn(`Unauthenticated request to ${req.path}`);
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default extractUserFromHeader;
