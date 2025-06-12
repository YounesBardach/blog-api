import logger from '../config/logger.js';

/**
 * Creates a problem details object compliant with RFC 7807.
 * @param {number} statusCode - The HTTP status code.
 * @param {string} title - A short, human-readable summary of the problem type.
 * @param {string} detail - A human-readable explanation specific to this occurrence of the problem.
 * @param {string} type - A URI identifier for the problem type.
 * @param {string} instance - A URI reference that identifies the specific occurrence of the problem.
 * @param {object} additional - Additional members for the problem details object.
 * @returns {object} The problem details object.
 */
const createProblemDetails = (statusCode, title, detail, type, instance, additional = {}) => {
  return {
    type: type || 'about:blank',
    title,
    status: statusCode,
    detail,
    instance,
    ...additional,
  };
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  const originalMessage = err.message || 'An unexpected error occurred.';
  let problemDetails;

  // Normalize err.errors early to avoid repetition
  const additionalErrorDetails =
    typeof err.errors === 'object' && err.errors !== null
      ? { ...err.errors }
      : err.errors
        ? { details: err.errors }
        : {};

  // --- Error Classification ---

  // Prisma errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    const instance = req.originalUrl;
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        problemDetails = createProblemDetails(
          statusCode,
          'Unique Constraint Violation',
          `A record with the provided value for field '${err.meta?.target?.join(', ')}' already exists.`,
          '/errors/unique-constraint-violation',
          instance,
          { field: err.meta?.target }
        );
        break;
      case 'P2025':
        statusCode = 404;
        problemDetails = createProblemDetails(
          statusCode,
          'Record Not Found',
          'The requested record could not be found.',
          '/errors/record-not-found',
          instance
        );
        break;
      case 'P2021':
        statusCode = 404;
        problemDetails = createProblemDetails(
          statusCode,
          'Table Not Found',
          'The requested database table does not exist.',
          '/errors/table-not-found',
          instance
        );
        break;
      case 'P2022':
        statusCode = 404;
        problemDetails = createProblemDetails(
          statusCode,
          'Column Not Found',
          'The requested database column does not exist.',
          '/errors/column-not-found',
          instance
        );
        break;
      default:
        statusCode = 500;
        problemDetails = createProblemDetails(
          statusCode,
          'Database Error',
          'An unexpected database error occurred.',
          '/errors/database-error',
          instance,
          { code: err.code }
        );
    }
  }
  // Validation errors (from express-validator)
  else if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
    statusCode = 400;
    problemDetails = createProblemDetails(
      statusCode,
      'Validation Error',
      err.message || 'Input validation failed.',
      '/errors/validation-error',
      req.originalUrl,
      {
        invalid_params: err.errors.map((valError) => ({
          name: valError.path,
          reason: valError.msg,
          value: valError.value,
        })),
      }
    );
  }
  // JWT library errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    problemDetails = createProblemDetails(
      statusCode,
      'Invalid Token',
      'The provided token is invalid or malformed.',
      '/errors/authentication/invalid-token',
      req.originalUrl
    );
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    problemDetails = createProblemDetails(
      statusCode,
      'Token Expired',
      'The provided token has expired.',
      '/errors/authentication/token-expired',
      req.originalUrl
    );
  }
  // CSRF errors
  else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    problemDetails = createProblemDetails(
      statusCode,
      'Invalid CSRF Token',
      'The CSRF token is invalid or missing.',
      '/errors/security/invalid-csrf-token',
      req.originalUrl
    );
  }
  // Rate limiting errors
  else if (err.name === 'RateLimitError') {
    statusCode = 429;
    problemDetails = createProblemDetails(
      statusCode,
      'Rate Limit Exceeded',
      originalMessage || 'You have exceeded the request rate limit.',
      '/errors/rate-limit-exceeded',
      req.originalUrl
    );
  }
  // CORS errors
  else if (originalMessage.includes('CORS policy')) {
    statusCode = 403;
    problemDetails = createProblemDetails(
      statusCode,
      'CORS Error',
      'This request was blocked by a CORS policy.',
      '/errors/security/cors-violation',
      req.originalUrl
    );
  }
  // Specific Application Errors (using a map for cleaner handling)
  else {
    const errorNameToProblemMap = {
      MissingTokenError: {
        statusCode: 401,
        title: 'Authentication Token Missing',
        type: '/errors/authentication/missing-token',
      },
      UserNotFoundForTokenError: {
        statusCode: 401,
        title: 'User Not Found For Token',
        type: '/errors/authentication/user-for-token-not-found',
      },
      TokenVerificationError: {
        statusCode: 401,
        title: 'Token Verification Failed',
        type: '/errors/authentication/token-verification-failed',
      },
      ForbiddenError: {
        statusCode: 403,
        title: 'Forbidden Access',
        type: '/errors/authorization/forbidden-access',
      },
      NotFoundError: {
        statusCode: 404,
        title: 'Resource Not Found',
        type: '/errors/resource-not-found',
      },
      DuplicateEntryError: {
        statusCode: 409,
        title: 'Duplicate Entry',
        type: '/errors/conflict/duplicate-entry',
      },
      InvalidDataError: {
        statusCode: 400,
        title: 'Invalid Data',
        type: '/errors/validation/invalid-data',
      },
      RelatedResourceNotFoundError: {
        statusCode: 400,
        title: 'Related Resource Not Found',
        type: '/errors/validation/related-resource-not-found',
      },
      CookieError: {
        statusCode: 500,
        title: 'Cookie Processing Error',
        type: '/errors/cookie-error',
      },
    };

    const mapping = errorNameToProblemMap[err.name];
    if (mapping) {
      statusCode = err.statusCode || mapping.statusCode;
      problemDetails = createProblemDetails(
        statusCode,
        mapping.title,
        originalMessage,
        mapping.type,
        req.originalUrl,
        additionalErrorDetails
      );
    }
  }

  // Fallback for truly unexpected errors
  if (!problemDetails) {
    const title = err.name && err.name !== 'Error' ? err.name : 'Unknown Error';
    const type = `/errors/${(err.name || 'unknown').toLowerCase().replace(/error$/, '')}`;
    problemDetails = createProblemDetails(
      statusCode,
      title,
      originalMessage,
      type,
      req.originalUrl,
      additionalErrorDetails
    );
  }

  // --- Response Finalization ---

  // Production safety for 500-level errors: obscure sensitive details
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    const finalMessage = 'An unexpected error occurred. We are looking into it.';
    problemDetails = createProblemDetails(
      500,
      'Internal Server Error',
      finalMessage,
      '/errors/internal-server-error',
      req.originalUrl
    );
  }
  // Development: Add stack to 500-level errors for easier debugging
  else if (statusCode >= 500 && process.env.NODE_ENV !== 'production') {
    problemDetails.stack = err.stack;
  }

  // Calculate status string based on final statusCode, done once
  const status = statusCode < 500 ? 'fail' : 'error';

  // Log the comprehensive error details for debugging and monitoring
  logger.error(originalMessage, {
    statusCode,
    status,
    responsePayload: problemDetails, // This is what the client gets
    originalError: {
      message: err.message,
      name: err.name,
      code: err.code,
    },
    stack: err.stack, // Full stack always logged
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Send the final error response to the client
  res.status(statusCode).json({
    success: false,
    status,
    ...problemDetails,
  });
};

// Example response:
// {
//   success: false,
//   status: "fail" | "error", // based on statusCode < 500
//   type: "/errors/validation-error", // URI reference for error type
//   title: "Validation Error", // short human-readable title
//   status: 400, // HTTP status code
//   detail: "Input validation failed.", // human-readable explanation
//   instance: "/api/resource/path", // request path where error occurred
//   invalid_params: [  // Optional: field-level validation details
//     {
//       name: "email",
//       reason: "Invalid email format",
//       value: "not-an-email"
//     }
//   ],
//   stack: "Error: ...\n at ..." // included only in non-production environments
// }

export default errorHandler;
