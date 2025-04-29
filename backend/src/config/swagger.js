import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Blog application',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt',
          description: 'JWT token stored in HTTP-only cookie'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-XSRF-TOKEN',
          description: 'CSRF token for POST, PUT, DELETE requests'
        }
      }
    },
    security: [
      {
        cookieAuth: [],
        csrfToken: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/docs/*.js'  // Path to the Swagger documentation files
  ]
};

const specs = swaggerJsdoc(options);

export default specs; 