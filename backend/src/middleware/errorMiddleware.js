import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500; // Prioritize error's own statusCode
  let status = statusCode < 500 ? 'fail' : 'error';
  let message = err.message || (status === 'fail' ? 'Request failed' : 'Internal Server Error');
  let responseErrors = {
    type:
      err.name && err.name !== 'Error'
        ? err.name
        : status === 'fail'
          ? 'client_error'
          : 'server_error',
    message: err.message || 'An unexpected error occurred.',
  };
  if (typeof err.errors === 'object' && err.errors !== null) {
    Object.assign(responseErrors, err.errors);
  } else if (err.errors) {
    responseErrors.details = err.errors;
  }

  // Prisma errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    message = err.message || message; // Keep original message if more specific
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Unique constraint violation';
        responseErrors = {
          type: 'unique_constraint',
          message: 'This value already exists',
          field: err.meta?.target,
        };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        responseErrors = {
          type: 'record_not_found',
          message: 'The requested record could not be found',
        };
        break;
      case 'P2021':
        statusCode = 404;
        message = 'Table does not exist';
        responseErrors = {
          type: 'table_not_found',
          message: 'The requested database table does not exist',
        };
        break;
      case 'P2022':
        statusCode = 404;
        message = 'Column does not exist';
        responseErrors = {
          type: 'column_not_found',
          message: 'The requested database column does not exist',
        };
        break;
      default:
        statusCode = 500; // Ensure it's 500 for unhandled Prisma codes
        message = 'Database error occurred';
        responseErrors = {
          type: 'database_error',
          code: err.code,
          message: err.message || 'An unexpected database error occurred',
        };
    }
    status = statusCode < 500 ? 'fail' : 'error';
  }
  // Validation errors (from express-validator)
  else if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
    statusCode = 400;
    message = 'Validation Error';
    responseErrors = {
      type: 'validation',
      message: err.message || 'Input validation failed',
      details: err.errors.map((valError) => ({
        message: valError.msg,
        field: valError.path,
        value: valError.value,
      })),
    };
  }
  // JWT library errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    responseErrors = {
      type: 'authentication_error',
      code: 'INVALID_TOKEN',
      message: 'The provided token is invalid or malformed.',
    };
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    responseErrors = {
      type: 'authentication_error',
      code: 'TOKEN_EXPIRED',
      message: 'The provided token has expired.',
    };
  }
  // Specific Application Errors (custom error.name checks)
  else if (err.name === 'MissingTokenError') {
    statusCode = err.statusCode || 401;
    message = err.message || 'Authentication token is missing.';
    responseErrors = {
      type: 'authentication_error',
      code: 'MISSING_TOKEN',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'UserNotFoundForTokenError') {
    statusCode = err.statusCode || 401;
    message = err.message || 'User for the provided token not found.';
    responseErrors = {
      type: 'authentication_error',
      code: 'USER_FOR_TOKEN_NOT_FOUND',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'TokenVerificationError') {
    statusCode = err.statusCode || 401;
    message = err.message || 'Token verification failed.';
    responseErrors = {
      type: 'authentication_error',
      code: 'TOKEN_VERIFICATION_FAILED',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'ForbiddenError') {
    statusCode = err.statusCode || 403;
    message = err.message || 'Access to this resource is forbidden.';
    responseErrors = {
      type: 'authorization_error',
      code: 'FORBIDDEN_ACCESS',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'NotFoundError') {
    statusCode = err.statusCode || 404;
    message = err.message || 'The requested resource was not found.';
    responseErrors = {
      type: 'resource_not_found',
      code: 'NOT_FOUND',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'DuplicateEntryError') {
    statusCode = err.statusCode || 409;
    message = err.message || 'This resource already exists.';
    responseErrors = {
      type: 'conflict_error',
      code: 'DUPLICATE_ENTRY',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'InvalidDataError') {
    statusCode = err.statusCode || 400;
    message = err.message || 'The provided data is invalid.';
    responseErrors = {
      type: 'validation_error',
      code: 'INVALID_DATA',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'RelatedResourceNotFoundError') {
    statusCode = err.statusCode || 400; // Or 422 if you prefer for this semantic
    message = err.message || 'A required related resource was not found.';
    responseErrors = {
      type: 'validation_error',
      code: 'RELATED_RESOURCE_NOT_FOUND',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  } else if (err.name === 'CookieError') {
    statusCode = err.statusCode || 500;
    message = err.message || 'A cookie-related error occurred.';
    responseErrors = {
      type: 'cookie_error',
      code: 'COOKIE_PROCESSING_ERROR',
      message,
      ...(typeof err.errors === 'object' && err.errors),
    };
  }
  // CSRF errors
  else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid CSRF token';
    responseErrors = {
      type: 'security_error',
      code: 'INVALID_CSRF_TOKEN',
      message: 'The CSRF token is invalid or missing.',
    };
  }
  // Rate limiting errors
  else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Too many requests';
    responseErrors = {
      type: 'rate_limit_exceeded',
      code: 'RATE_LIMIT',
      message: err.message || 'You have exceeded the rate limit.',
    };
  }
  // CORS errors
  else if (err.message && err.message.includes('CORS policy')) {
    statusCode = 403;
    message = 'CORS Error: Not allowed by CORS policy';
    responseErrors = { type: 'cors_error', code: 'CORS_VIOLATION', message: err.message };
  }
  // Fallback for truly unexpected errors or errors not fitting above categories
  else {
    // Default to 500 if not already set by a more specific handler or err.statusCode
    statusCode = err.statusCode || 500;
    message = err.message || (statusCode === 500 ? 'Internal Server Error' : 'An error occurred');
    responseErrors = {
      type: err.name && err.name !== 'Error' ? err.name : 'unknown_error',
      message: err.message || 'An unexpected issue occurred.',
      ...(typeof err.errors === 'object' && err.errors !== null && err.errors),
    };
  }

  // Determine final status string based on statusCode
  status = statusCode < 500 ? 'fail' : 'error';

  // Production safety for 500-level errors
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred. Please try again later.';
    responseErrors = {
      type: 'server_error',
      message: 'An unexpected error occurred. We are looking into it.',
    };
  }
  // Development: Add stack to 500-level errors in the response for easier debugging
  else if (statusCode >= 500 && process.env.NODE_ENV !== 'production') {
    if (!responseErrors.stack) {
      // Add stack if not already present (e.g. from explicit handlers)
      responseErrors.stack = err.stack;
    }
  }

  // Log the error
  logger.error(message, {
    statusCode,
    status,
    errors: responseErrors,
    originalError: {
      message: err.message,
      name: err.name,
      code: err.code,
    },
    stack: err.stack, // Full stack always logged for server records
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    status,
    message,
    errors: responseErrors,
  });
};

export default errorHandler;
