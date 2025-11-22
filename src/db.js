import mongoose from 'mongoose';
import logger from '../logger.js';

export const connectDB = async () => {
  try {
    const mongoUser = process.env.MONGOADMIN;
    const mongoPass = process.env.MONGOPASS;

    let mongoUrl;

    if (process.env.NODE_ENV === 'test' && process.env.MONGOTESTURL) {
      mongoUrl = process.env.MONGOTESTURL;
      logger.info('Connecting to TEST database');
    } else {
      mongoUrl = process.env.MONGOURL;
      logger.info('Connecting to MAIN database');
    }

    if (!mongoUrl) {
      logger.error('No MongoDB URL found — cannot connect.');
      throw new Error('Missing MongoDB URL');
    }

    if (mongoUrl.includes('ADMIN') && mongoUrl.includes('PASS')) {
      mongoUrl = mongoUrl
        .replace('ADMIN', mongoUser || '')
        .replace('PASS', mongoPass || '');
    }

    await mongoose.connect(mongoUrl);
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (err) {
    logger.error(`MongoDB disconnection error: ${err.message}`);
  }
};
