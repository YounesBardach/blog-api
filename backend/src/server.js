// Import core Express library for building the web server
import express from 'express';
// Import dotenv to load environment variables from a .env file
import dotenv from 'dotenv';
// Import envalid for validating and accessing environment variables
import { cleanEnv, str, port } from 'envalid';

// Import route handlers for different API resources
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

// Import custom error handling middleware
import errorHandler from './middleware/errorMiddleware.js';

// Import Swagger UI for API documentation
import swaggerUi from 'swagger-ui-express';
// Import Swagger configuration (jsdoc output)
import specs, { swaggerUiOptions } from './config/swagger.js';

// Import cookie-parser middleware for handling cookies
import cookieParser from 'cookie-parser';
// Import csurf middleware for CSRF protection
import csrf from 'csurf';
// Import cors middleware for enabling Cross-Origin Resource Sharing
import cors from 'cors';
// Import custom logger utility
import logger from './config/logger.js';
// Import helmet middleware for setting various security HTTP headers
import helmet from 'helmet';
// Import express-rate-limit middleware for limiting request rates
import rateLimit from 'express-rate-limit';

// Load environment variables from .env file into process.env
dotenv.config();

// Validate and sanitize environment variables using envalid
const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'], // Allowed environment names
    default: 'development', // Default environment if not set
  }),
  PORT: port({ default: 3000 }), // Server port, defaults to 3000
  DATABASE_URL: str(), // Database connection string (required)
  JWT_SECRET: str(), // Secret key for JWT signing (required)
  JWT_EXPIRE: str({ default: '30d' }), // JWT expiration time, defaults to 30 days
  CORS_ORIGINS: str({ default: '' }), // Comma-separated list of allowed CORS origins
  LOG_LEVEL: str({ default: 'info' }), // Logging level, defaults to 'info'
});

// Initialize the Express application
const app = express();

// Apply Helmet middleware to set security-related HTTP headers
app.use(helmet());

// Middleware to parse incoming requests with JSON payloads
app.use(express.json());

// Middleware to parse cookies attached to the client request object
app.use(cookieParser());

// Basic rate limiting middleware configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes time window
  max: 100, // Max 100 requests per IP within the time window
  standardHeaders: true, // Send standard `RateLimit-*` headers
  legacyHeaders: false, // Disable old `X-RateLimit-*` headers
  handler: (req, res, next, optionsUsed) => {
    const err = new Error(
      `Too many requests from this IP, please try again after ${Math.ceil(optionsUsed.windowMs / 60000)} minutes`
    );
    err.name = 'RateLimitError';
    next(err);
  },
});
// Apply rate limiting to all requests
app.use(limiter);

// Configure CORS (Cross-Origin Resource Sharing)
// Get allowed origins from environment variable, split by comma, and filter out empty strings
const allowedOrigins = env.CORS_ORIGINS.split(',').filter(Boolean);
logger.info(`Allowed CORS origins: ${allowedOrigins.join(', ')}`); // Log configured origins

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl) in development mode
      if (!origin && env.NODE_ENV === 'development') return callback(null, true);
      // Check if the incoming origin is in the list of allowed origins
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false); // Disallow if origin is not whitelisted
      }
      return callback(null, true); // Allow if origin is whitelisted
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'], // Allowed request headers
    credentials: true, // Allow cookies and authorization headers to be sent
    preflightContinue: false, // Do not pass preflight requests to other routes
    optionsSuccessStatus: 204, // Return 204 No Content for successful OPTIONS requests
  })
);

// CSRF (Cross-Site Request Forgery) protection setup
const csrfProtection = csrf({
  cookie: {
    // Configuration for the CSRF token cookie
    httpOnly: true, // Cookie cannot be accessed by client-side JavaScript
    secure: process.env.NODE_ENV === 'production', // Cookie only sent over HTTPS in production
    sameSite: 'strict', // Cookie only sent for same-site requests
  },
});

// Apply CSRF protection selectively based on HTTP method
app.use((req, res, next) => {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(req.method)) {
    // Apply full CSRF protection for methods that change server state
    return csrfProtection(req, res, next);
  } else if (req.method === 'GET') {
    // For GET requests, initialize CSRF to make a token available for subsequent state-changing requests.
    // This also sets the XSRF-TOKEN cookie if it's not already set.
    csrfProtection(req, res, () => {
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        // Ensure XSRF-TOKEN cookie is set with the current token
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      next();
    });
  } else {
    // For other methods (like OPTIONS, HEAD), skip CSRF protection
    next();
  }
});

// Define a simple root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Welcome to the Blog API',
  });
});

// Mount API routes for different resources
app.use('/api/users', userRoutes); // User-related routes
app.use('/api/posts', postRoutes); // Post-related routes
app.use('/api/comments', commentRoutes); // Comment-related routes

// Serve Swagger API documentation at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Apply the global error handling middleware (must be last middleware)
app.use(errorHandler);

// Get the port from the validated environment variables
const PORT = env.PORT;

// Start the Express server
app.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
