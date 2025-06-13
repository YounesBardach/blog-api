import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if it exists
  if (Object.keys(metadata).length > 0) {
    msg += '\n' + JSON.stringify(metadata, null, 2);
  }

  // Format stack trace if it exists
  if (stack) {
    msg += '\n\nStack Trace:';
    msg +=
      '\n' +
      stack
        .split('\n')
        .map((line) => '  ' + line.trim())
        .join('\n');
  }

  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console(),
    // Add file transport for production if needed
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
  exceptionHandlers: [
    // Optional: Log unhandled exceptions to a file
    // new winston.transports.File({ filename: 'exceptions.log' })
  ],
  rejectionHandlers: [
    // Optional: Log unhandled promise rejections to a file
    // new winston.transports.File({ filename: 'rejections.log' })
  ],
});

// If not in production then log to the console with custom format
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), devFormat),
    })
  );
}

export default logger;
