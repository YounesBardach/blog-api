import express from 'express';
import dotenv from 'dotenv';
import asyncHandler from 'express-async-handler';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import specs from './config/swagger.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.get('/', asyncHandler(async (req, res) => {
  res.json({ message: 'Welcome to the Blog API' });
}));

// API Routes
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/comments', commentRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/docs`);
}); 