import jwt from 'jsonwebtoken';
import logger from '../../logger.js';

const openPaths = [
  '/api/v1/docs/',
  '/api/v1/health',
  '/api/v1/about',
  '/api/v1/changelog',
  '/api/v1/version',
];

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

export default verifyToken;
