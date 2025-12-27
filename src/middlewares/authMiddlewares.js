import jwt from 'jsonwebtoken';
import logger from '../../logger.js';

const openPaths = [
  '/api/v1/docs/',
  '/api/v1/health',
  '/api/v1/kafka/health',
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

  try {
    const gatewayAuth = req.headers['x-gateway-authenticated'];
    if (!gatewayAuth || gatewayAuth !== 'true') {
      logger.warn(
        `Unauthenticated request to ${req.path} - Missing gateway authentication`
      );
      return res.status(401).json({
        success: false,
        message:
          'Authentication required. Request must come through the API Gateway.',
      });
    } else {
      const userId = req.headers['x-user-id'];
      const roles = req.headers['x-roles'];

      req.user = {
        id: userId,
        'x-user-id': userId,
        username: userId,
        roles: roles ? roles.split(',') : [],
      };
      if (!userId) {
        logger.warn(`Unauthenticated request to ${req.path} - Missing user ID`);
        return res.status(401).json({
          success: false,
          message: 'Missing user identification',
        });
      }
    }
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default verifyToken;
