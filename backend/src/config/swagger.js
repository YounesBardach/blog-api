import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API Documentation',
      version: '1.0.0',
      description: `API documentation for the Blog application

## Authentication
This API uses CSRF protection. Before making any non-GET requests:
1. First make a GET request to /api/csrf-token to obtain a CSRF token
2. The token will be automatically set as a cookie and used in subsequent requests
3. The Swagger UI will automatically handle the CSRF token for you`,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-XSRF-TOKEN',
          description: 'CSRF Token obtained from /api/csrf-token endpoint'
        }
      }
    }
  },
  apis: [
    './src/docs/*.js',  // Path to the Swagger documentation files
  ]
};

const specs = swaggerJsdoc(options);

// Swagger UI configuration
export const swaggerUiOptions = {
  swaggerOptions: {
    withCredentials: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true
  }
};

export default specs; 