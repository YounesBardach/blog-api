import express from 'express';
import dotenv from 'dotenv';
import { cleanEnv, str, port } from 'envalid';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import specs, { swaggerUiOptions } from './config/swagger.js';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import cors from 'cors';
import logger from './config/logger.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load and validate environment variables
dotenv.config();
const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production', 'staging'], default: 'development' }),
  PORT: port({ default: 3000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  JWT_EXPIRE: str({ default: '30d' }),
  CORS_ORIGINS: str({ default: '' }), // Comma-separated string
  LOG_LEVEL: str({ default: 'info' }),
});

const app = express();

// Apply basic security headers
app.use(helmet());

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Basic rate limiting (apply before CORS and other routes)
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `windowMs`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, status: 'fail', message: 'Too many requests, please try again after 15 minutes' }
});
app.use(limiter);

// Enable CORS with credentials
const allowedOrigins = env.CORS_ORIGINS.split(',').filter(Boolean);
logger.info(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) in dev
    if (!origin && env.NODE_ENV === 'development') return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// CSRF protection
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Route to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({
    success: true,
    status: 'success',
    message: 'CSRF token set successfully'
  });
});

// Middleware to automatically set X-XSRF-TOKEN header from cookie
app.use((req, res, next) => {
  if (!req.headers['x-xsrf-token']) {
    const csrfToken = req.cookies['XSRF-TOKEN'];
    if (csrfToken) {
      req.headers['x-xsrf-token'] = csrfToken;
    }
  }
  next();
});
// Apply CSRF protection based on HTTP method
app.use((req, res, next) => {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (stateChangingMethods.includes(req.method)) {
    // Apply CSRF protection for state-changing methods
    return csrfProtection(req, res, next);
  } else if (req.method === 'GET') {
    // Initialize CSRF protection for GET requests to ensure token availability
    csrfProtection(req, res, () => {
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      next();
    });
  } else {
    // Skip CSRF for OPTIONS and other methods
    next();
  }
});

// Routes
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Welcome to the Blog API'
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Error handling middleware
app.use(errorHandler);

const PORT = env.PORT; // Use validated port

app.listen(PORT, () => {
  logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 