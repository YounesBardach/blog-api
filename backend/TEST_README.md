# Backend Testing Guide

This document provides comprehensive information about testing the Blog API backend.

## Testing Stack

- **Vitest**: Fast unit test framework with native ES modules support
- **Supertest**: HTTP assertion library for API endpoint testing
- **@vitest/coverage-v8**: Code coverage reporting
- **@vitest/ui**: Web-based test UI for better debugging

## Test Structure

```
backend/
├── test/
│   ├── setup.js                 # Global test configuration
│   ├── helpers/
│   │   └── testHelpers.js       # Utility functions for tests
│   ├── routes/
│   │   ├── app.test.js          # Basic app tests
│   │   ├── userRoutes.test.js   # User API endpoint tests
│   │   └── postRoutes.test.js   # Post API endpoint tests
│   ├── services/
│   │   └── userService.test.js  # Business logic tests
│   └── middleware/
│       └── authMiddleware.test.js # Middleware tests
├── vitest.config.js             # Vitest configuration
└── .env.test                    # Test environment variables
```

## Environment Setup

### 1. Test Database Configuration

The tests use a separate PostgreSQL database to avoid affecting your development data:

```env
# .env.test
NODE_ENV=test
PORT=3001
DATABASE_URL="postgresql://virtu:Virtu+22@localhost:5432/myapp_test?schema=public"
JWT_SECRET=test_jwt_secret_very_long_and_complex_for_testing_purposes_only
JWT_EXPIRE=1h
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=error
```

### 2. Database Migration for Tests

Before running tests, ensure your test database schema is up to date:

```bash
npm run test:setup
```

This command runs:

- `prisma migrate deploy` with test environment
- `prisma generate` to update the Prisma client

## Available Test Scripts

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open interactive test UI in browser
npm run test:ui

# Setup test database
npm run test:setup
```

## Test Categories

### 1. Integration Tests (Routes)

Test complete API endpoints with database interactions:

```javascript
// Example: Testing user registration
it('should register a new user successfully', async () => {
  const userData = {
    email: 'newuser@example.com',
    username: 'newuser',
    firstName: 'New',
    lastName: 'User',
    password: 'password123',
    confirmPassword: 'password123',
  };

  const response = await request(app)
    .post('/api/users/register')
    .set('X-XSRF-TOKEN', csrfToken)
    .send(userData)
    .expect(201);

  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('token');
});
```

### 2. Unit Tests (Services)

Test business logic in isolation:

```javascript
// Example: Testing user service
it('should register a new user successfully', async () => {
  const userData = {
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    password: 'password123',
  };

  const result = await register(userData);

  expect(result).toHaveProperty('user');
  expect(result).toHaveProperty('token');
  expect(result.user.email).toBe(userData.email);
});
```

### 3. Middleware Tests

Test authentication and authorization:

```javascript
// Example: Testing auth middleware
it('should authenticate user with valid token', async () => {
  const req = {
    headers: {
      authorization: `Bearer ${validToken}`,
    },
  };

  await protect(req, res, mockNext);

  expect(req.user).toBeDefined();
  expect(mockNext).toHaveBeenCalled();
});
```

## Test Helpers

### Database Helpers

```javascript
import { createTestUser, createTestPost, createTestComment } from '../helpers/testHelpers.js';

// Create a test user
const user = await createTestUser({
  email: 'test@example.com',
  username: 'testuser',
});

// Create a test post
const post = await createTestPost(user.id, {
  title: 'Test Post',
  published: true,
});

// Create a test comment
const comment = await createTestComment(user.id, post.id, {
  content: 'Test comment',
});
```

### Authentication Helpers

```javascript
import { generateTestToken, createAuthHeaders } from '../helpers/testHelpers.js';

// Generate JWT token
const token = generateTestToken(user.id);

// Create authenticated request headers
const headers = createAuthHeaders(token, csrfToken);
```

### CSRF Token Handling

```javascript
import { getCsrfToken } from '../helpers/testHelpers.js';

// Get CSRF token from response
const response = await request(app).get('/');
const csrfToken = getCsrfToken(response);
```

## Database Management

### Test Isolation

Each test runs with a clean database state:

1. **beforeAll**: Connects to test database and resets schema
2. **beforeEach**: Truncates all tables for clean test state
3. **afterAll**: Disconnects from database

### Test Data Cleanup

The test setup automatically cleans up data between tests to ensure isolation:

```javascript
beforeEach(async () => {
  // Clear all tables in correct order to avoid FK constraints
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  for (const { tablename } of tableNames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});
```

## Coverage Reports

Generate detailed coverage reports:

```bash
npm run test:coverage
```

Coverage reports include:

- **Text output**: Console summary
- **HTML report**: Detailed interactive report in `coverage/` directory
- **JSON report**: Machine-readable coverage data

### Coverage Thresholds

The project enforces minimum coverage thresholds:

```javascript
// vitest.config.js
coverage: {
  thresholds: {
    global: {
      branches: 70,    // 70% branch coverage
      functions: 70,   // 70% function coverage
      lines: 70,       // 70% line coverage
      statements: 70   // 70% statement coverage
    }
  }
}
```

## Best Practices

### 1. Test Organization

- **Group related tests** using `describe()` blocks
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Database Testing

- **Use test helpers** for consistent data creation
- **Test both success and error cases**
- **Verify database state changes** when appropriate

### 3. API Testing

- **Test all HTTP methods** (GET, POST, PUT, DELETE)
- **Verify response structure** and status codes
- **Test authentication and authorization**
- **Include CSRF token** for state-changing requests

### 4. Error Testing

- **Test validation errors**
- **Test authentication failures**
- **Test authorization failures**
- **Test database constraint violations**

### 5. Mock Usage

- **Mock external services** (email, payment, etc.)
- **Use vi.fn()** for function mocking
- **Clear mocks** between tests with `vi.clearAllMocks()`

## Debugging Tests

### Interactive Test UI

Launch the web-based test interface:

```bash
npm run test:ui
```

This provides:

- **Visual test runner** with filtering and search
- **Code coverage visualization**
- **Test execution timeline**
- **Error stack traces**

### Watch Mode

Run tests in watch mode for rapid development:

```bash
npm run test:watch
```

### Console Debugging

Add debugging statements in tests:

```javascript
// Debug test data
console.log('Test user:', JSON.stringify(testUser, null, 2));

// Debug API responses
console.log('Response body:', response.body);
```

## Common Issues and Solutions

### 1. Database Connection Issues

**Problem**: Tests fail with database connection errors

**Solution**: Ensure PostgreSQL is running and test database exists:

```bash
# Connect to PostgreSQL
psql -U virtu -h localhost

# Create test database
CREATE DATABASE myapp_test;

# Run migrations
npm run test:setup
```

### 2. CSRF Token Issues

**Problem**: POST/PUT/DELETE requests fail with CSRF errors

**Solution**: Ensure CSRF token is included in requests:

```javascript
// Get CSRF token first
const response = await request(app).get('/');
const csrfToken = getCsrfToken(response);

// Include in subsequent requests
await request(app).post('/api/endpoint').set('X-XSRF-TOKEN', csrfToken).send(data);
```

### 3. Test Timeouts

**Problem**: Tests timeout with database operations

**Solution**: Increase timeout in vitest config:

```javascript
// vitest.config.js
test: {
  testTimeout: 30000, // 30 seconds
}
```

### 4. Test Isolation Issues

**Problem**: Tests affect each other's data

**Solution**: Ensure proper cleanup in setup file and verify test helpers are working correctly.

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Ensure all tests pass** before submitting PR
3. **Maintain coverage thresholds**
4. **Update test documentation** if needed

## Example Test Workflow

```bash
# 1. Setup test environment
npm run test:setup

# 2. Run tests in watch mode while developing
npm run test:watch

# 3. Run full test suite with coverage
npm run test:coverage

# 4. Check coverage report
open coverage/index.html
```
