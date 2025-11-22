import { createLogger, format, transports } from 'winston';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ quiet: true, path: path.join(__dirname, '.env') });

const logLevel = (process.env.LOG_LEVEL || 'info').trim().toLowerCase();

const levelColors = {
  info: '\x1b[34m', // Blue
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  debug: '\x1b[32m', // Green
  verbose: '\x1b[38;2;161;74;189m', // Purple
  silly: '\x1b[35m', // Magenta
};

const resetColor = '\x1b[0m';

const logFormat = format.printf(({ level, message, timestamp }) => {
  const color = levelColors[level] || '';
  return `${new Date(timestamp).toLocaleString()} [${color}${level.toUpperCase()}${resetColor}]: ${message}`;
});

const logger = createLogger({
  level: logLevel,
  format: format.combine(format.timestamp(), logFormat),
  transports: [new transports.Console({ level: logLevel })],
});

export default logger;
