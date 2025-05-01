import express from 'express';
import dotenv from 'dotenv';
import asyncHandler from 'express-async-handler';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import specs, { swaggerUiOptions } from './config/swagger.js';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Enable CORS with credentials
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// CSRF protection
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: false,  // Allow Swagger UI to access the cookie
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 