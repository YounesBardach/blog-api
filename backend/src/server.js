import express from 'express';
import dotenv from 'dotenv';
import asyncHandler from 'express-async-handler';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import specs from './config/swagger.js';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Add your frontend URLs
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// CSRF protection
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply CSRF protection to all routes except GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    next();
  } else {
    csrfProtection(req, res, next);
  }
});

// Add CSRF token to response
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  next();
});

// Routes
app.get('/', asyncHandler(async (req, res) => {
  res.json({ message: 'Welcome to the Blog API' });
}));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 