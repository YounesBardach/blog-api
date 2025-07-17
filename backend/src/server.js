// Import the configured Express app and environment variables
import { app, env } from './app.js';
// Import custom logger utility
import logger from './config/logger.js';

// Get the port from the validated environment variables
const PORT = env.PORT;

// Start the Express server
app.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
