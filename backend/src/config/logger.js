import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Format metadata more concisely
  if (Object.keys(metadata).length > 0) {
    const important = [];
    if (metadata.statusCode) important.push(`status:${metadata.statusCode}`);
    if (metadata.method) important.push(`${metadata.method}`);
    if (metadata.url) important.push(`${metadata.url}`);
    if (metadata.type) important.push(`type:${metadata.type}`);
    if (metadata.errorName) important.push(`error:${metadata.errorName}`);
    if (metadata.errorCode) important.push(`code:${metadata.errorCode}`);

    if (important.length > 0) {
      msg += ` (${important.join(' | ')})`;
    }

    // Only show full JSON for non-standard metadata
    const standardKeys = ['statusCode', 'method', 'url', 'type', 'errorName', 'errorCode', 'ip'];
    const extraMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([key]) => !standardKeys.includes(key))
    );

    if (Object.keys(extraMetadata).length > 0) {
      msg += '\n' + JSON.stringify(extraMetadata, null, 2);
    }
  }

  if (stack) {
    // Handle both literal \n strings and actual newlines
    const normalizedStack = stack.replace(/\\n/g, '\n');
    msg +=
      '\n\nStack Trace:\n' +
      normalizedStack
        .split('\n')
        .map((line) => '  ' + line.trim())
        .filter((line) => line.trim()) // Remove empty lines
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
  level: process.env.NODE_ENV === 'test' ? 'warn' : process.env.LOG_LEVEL || 'info',
  format: winston.format.errors({ stack: true }), // ensures stack property is populated
  transports,
});

export default logger;
