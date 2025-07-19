import errorHandler from '../src/middleware/errorMiddleware.js';
import logger from '../src/config/logger.js';

// Mock the logger module to prevent console output and to track calls
vi.mock('../src/config/logger.js', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('Error Middleware', () => {
  let mockRequest;
  let mockResponse;
  let nextFunction;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset mocks and environment before each test
    vi.restoreAllMocks();
    process.env = { ...originalEnv };

    mockRequest = {
      originalUrl: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
    };

    mockResponse = {
      // mockReturnThis returns mockResponse object itself (for chaining)
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    nextFunction = vi.fn();
  });

  test('should handle express-validator ValidationError', () => {
    const error = new Error('Input validation failed.');
    error.name = 'ValidationError';
    error.errors = [{ path: 'email', msg: 'Must be a valid email', value: 'bad-email' }];

    errorHandler(error, mockRequest, mockResponse, nextFunction);
    // keys that are not included have default values in errorMiddleware.js
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/validation-error',
        title: 'Validation Error',
        statusCode: 400,
        invalid_params: expect.arrayContaining([
          expect.objectContaining({ name: 'email', reason: 'Must be a valid email' }),
        ]),
      })
    );
    expect(logger.error).toHaveBeenCalled();
  });

  test('should handle Prisma P2002 unique constraint violation', () => {
    const error = new Error('Unique constraint failed');
    error.code = 'P2002';
    error.meta = { target: ['username'] };

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/unique-constraint-violation',
        title: 'Unique Constraint Violation',
        detail: `A record with the provided value for field 'username' already exists.`,
        field: ['username'],
      })
    );
  });

  test('should handle Prisma P2025 record not found error', () => {
    const error = new Error('Record to update not found.');
    error.code = 'P2025';

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/record-not-found',
        title: 'Record Not Found',
      })
    );
  });

  test('should handle custom application NotFoundError', () => {
    const error = new Error('The requested resource does not exist.');
    error.name = 'NotFoundError';

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/resource-not-found',
        title: 'Resource Not Found',
        detail: 'The requested resource does not exist.',
      })
    );
  });

  test('should handle JWT TokenExpiredError', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/authentication/token-expired',
        title: 'Token Expired',
      })
    );
  });

  test('should handle unknown errors with a fallback', () => {
    const error = new Error('A very strange thing happened.');

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '/errors/unknown',
        title: 'Unknown Error',
        detail: 'A very strange thing happened.',
      })
    );
  });

  test('should hide stack trace and show generic message for 500 errors in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Sensitive database connection error');
    error.statusCode = 500;

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    const responseBody = mockResponse.json.mock.calls[0][0];

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseBody.title).toBe('Internal Server Error');
    expect(responseBody.detail).toBe('An unexpected error occurred. We are looking into it.');
    expect(responseBody).not.toHaveProperty('stack');
  });

  test('should show stack trace for any error in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Something broke');
    error.stack = 'Error: Something broke at file.js:10:1';

    errorHandler(error, mockRequest, mockResponse, nextFunction);

    const responseBody = mockResponse.json.mock.calls[0][0];

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(responseBody.detail).toBe('Something broke');
    expect(responseBody).toHaveProperty('stack');
    expect(responseBody.stack).toBe(error.stack);
  });
});
