import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += '\n' + JSON.stringify(metadata, null, 2);
  }

  if (stack) {
    msg +=
      '\n\nStack Trace:\n' +
      stack
        .split('\n')
        .map((line) => '  ' + line.trim())
        .join('\n');
  }

  return msg;
});

// Create an array of transports based on environment
const transports = [];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), devFormat),
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
        // could add JSON format or plain printf for production
      ),
    })
  );
}

// Now create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.errors({ stack: true }), // ensures stack property is populated
  transports,
});

export default logger;
