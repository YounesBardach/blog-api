// Import the swagger-jsdoc library to generate Swagger documentation from JSDoc comments
import swaggerJsdoc from 'swagger-jsdoc';

// Define the options for swagger-jsdoc
const options = {
  // Definition of the Swagger document structure (OpenAPI specification)
  definition: {
    openapi: '3.0.0', // OpenAPI version
    info: {
      title: 'Blog API', // Title of the API
      version: '1.0.0', // Version of the API
      // Detailed description of the API, including authentication information
      description: `API documentation for the Blog application

## Authentication
This API uses CSRF protection.
When using this Swagger UI:
- An XSRF-TOKEN cookie is automatically set by the server upon any GET request.
- This UI will automatically read this cookie and include the token in the 'X-XSRF-TOKEN' header for all subsequent state-changing requests (POST, PUT, DELETE, PATCH).

For client applications (like a React frontend):
1. Ensure a GET request is made to any API endpoint first to receive the 'XSRF-TOKEN' cookie. This cookie is configured to be readable by JavaScript.
2. Your application should read this 'XSRF-TOKEN' cookie.
3. For any state-changing requests (POST, PUT, DELETE, PATCH), include the value of the token in an 'X-XSRF-TOKEN' HTTP header.`,
      contact: {
        name: 'API Support', // Contact name for API support
        email: 'support@example.com', // Contact email for API support
      },
    },
    // Define servers where the API is hosted
    servers: [
      {
        // Dynamically set the server URL using the PORT environment variable
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server', // Description of the server
      },
    ],
    // Define reusable components, such as security schemes and schemas
    components: {
      // Define security schemes used by the API
      securitySchemes: {
        // Define a cookie-based authentication scheme
        cookieAuth: {
          type: 'apiKey', // Type of security scheme (apiKey is used for cookie-based auth in Swagger 3.0)
          in: 'cookie', // Location of the API key (in this case, a cookie)
          name: 'connect.sid', // Name of the session cookie (adjust if your session cookie name is different)
          description:
            'Session cookie for authentication. Ensure cookies are enabled in your client.',
        },
        // Define a CSRF token scheme, passed in a header
        csrfToken: {
          type: 'apiKey',
          in: 'header', // Location of the API key (header)
          name: 'X-XSRF-TOKEN', // Standard header name for CSRF tokens
          description:
            'CSRF token obtained from the XSRF-TOKEN cookie (set automatically on GET requests) and sent as a header for state-changing requests.',
        },
      },
      // Define reusable schema definitions for request and response bodies
      schemas: {
        // Schemas are now defined in src/docs/schemas.doc.js
      },
    },
    // Define global security requirements. An empty array means no security is applied by default.
    // Security is typically applied on a per-operation basis using the 'security' keyword in JSDoc.
    security: [],
    tags: [
      {
        name: '1. General',
        description: 'General-purpose endpoints',
      },
      {
        name: '2. Users',
        description: 'User management and authentication',
      },
      {
        name: '3. Posts',
        description: 'API for managing blog posts',
      },
      {
        name: '4. Comments',
        description: 'Managing comments on posts',
      },
    ],
  },
  // An array of glob patterns pointing to files containing JSDoc comments for routes, schemas, etc.
  apis: [
    './src/docs/*.docs.js', // Path to the Swagger documentation files
  ],
};

// Generate the Swagger/OpenAPI specification object using swagger-jsdoc with the defined options
const specs = swaggerJsdoc(options);

// Define options for configuring the Swagger UI appearance and behavior
export const swaggerUiOptions = {
  swaggerOptions: {
    requestInterceptor: function (req) {
      // The cookie will be automatically included by the browser. This interceptor
      // reads the XSRF-TOKEN cookie and adds it to the X-XSRF-TOKEN header
      // for all requests made from the Swagger UI.
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      if (csrfToken) {
        req.headers['X-XSRF-TOKEN'] = csrfToken;
      }
      return req;
    },
    withCredentials: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
};

// Export the generated Swagger specification to be used by swagger-ui-express middleware
export default specs;
