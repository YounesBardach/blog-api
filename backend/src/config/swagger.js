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

## Authentication & CSRF
This API uses cookie-based auth and CSRF protection.

CSRF token acquisition:
- On any GET request, the server sets an 'XSRF-TOKEN' cookie.
- Cross-origin clients can also call 'GET /api/csrf-token' to receive '{ csrfToken }' in the JSON response.

How to send the token:
- For state-changing requests (POST, PUT, PATCH, DELETE), include the token in the 'X-XSRF-TOKEN' header.
- When using Axios, enable 'withCredentials' and either let Axios read the cookie (same-origin) or fetch '/api/csrf-token' and set the header value from 'resp.data.csrfToken'.

Note: No custom CSRF response headers are used; the JSON endpoint is the recommended cross-origin approach.`,
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
    // Define the components section of the OpenAPI specification
    components: {
      // Define security schemes used by the API
      securitySchemes: {
        // Define a cookie-based authentication scheme
        cookieAuth: {
          type: 'apiKey', // Type of security scheme (apiKey is used for cookie-based auth in Swagger 3.0)
          in: 'cookie', // Location of the API key (in this case, a cookie)
          name: 'jwt', // Name of the authentication cookie used by the application
          description: 'JWT authentication cookie. Ensure cookies are enabled in your client.',
        },
        // Define a CSRF token scheme, passed in a header
        csrfToken: {
          type: 'apiKey',
          in: 'header', // Location of the API key (header)
          name: 'X-XSRF-TOKEN', // Standard header name for CSRF tokens
          description:
            "CSRF token sent in the 'X-XSRF-TOKEN' header for state-changing requests. Obtain it from the 'XSRF-TOKEN' cookie or via 'GET /api/csrf-token' (JSON: { csrfToken }).",
        },
      },
      // Define reusable schema definitions for request and response bodies
      schemas: {
        // Placeholder for schemas - these are typically imported from separate files
        // The actual schema definitions are loaded from the docs directory
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
  // Specify the files that contain Swagger/OpenAPI annotations (JSDoc comments)
  apis: [
    './src/docs/*.js', // Include all .js files in the src/docs directory for JSDoc scanning
  ],
};

// Create the Swagger specification by processing the JSDoc comments
const specs = swaggerJsdoc(options);

// Configuration options for the Swagger UI interface
export const swaggerUiOptions = {
  // Explorer allows users to see all available endpoints without authentication
  explorer: true,
  // Customize the Swagger UI theme and layout
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  // Custom site title
  customSiteTitle: 'Blog API Documentation',
  // Customize the favicon (optional)
  // customfavIcon: '/favicon.ico',
  // Additional UI configuration
  swaggerOptions: {
    // Automatically try to authorize when the page loads
    persistAuthorization: true,
    // Display request duration in the UI
    displayRequestDuration: true,
    // Configure how operations are displayed
    docExpansion: 'list', // Can be 'none', 'list', or 'full'
    // Default models expansion depth
    defaultModelsExpandDepth: 2,
    // Default model expansion depth for examples
    defaultModelExpandDepth: 2,
    // Show request headers in the UI
    showRequestHeaders: true,
    // Show common parameters at the top level
    showCommonExtensions: true,
  },
};

// Export the generated Swagger specification as the default export
export default specs;
