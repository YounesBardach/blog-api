import logger from '../config/logger.js';

const createProblemDetails = (type, title, statusCode, detail, instance, additional = {}) => ({
  type: type || 'about:blank',
  title,
  statusCode,
  detail,
  instance,
  ...additional,
});

const prismaErrorMap = {
  P2002: {
    type: '/errors/unique-constraint-violation',
    title: 'Unique Constraint Violation',
    statusCode: 409,
    getDetail: (err) =>
      `A record with the provided value for field '${err.meta?.target?.join(', ')}' already exists.`,
    extra: (err) => ({ field: err.meta?.target }),
  },
  P2025: {
    type: '/errors/record-not-found',
    title: 'Record Not Found',
    statusCode: 404,
    detail: 'The requested record could not be found.',
  },
  P2021: {
    type: '/errors/table-not-found',
    title: 'Table Not Found',
    statusCode: 404,
    detail: 'The requested database table does not exist.',
  },
  P2022: {
    type: '/errors/column-not-found',
    title: 'Column Not Found',
    statusCode: 404,
    detail: 'The requested database column does not exist.',
  },
};

const appErrorMap = {
  MissingTokenError: {
    type: '/errors/authentication/missing-token',
    title: 'Authentication Token Missing',
    statusCode: 401,
  },
  UserNotFoundForTokenError: {
    type: '/errors/authentication/user-for-token-not-found',
    title: 'User Not Found For Token',
    statusCode: 401,
  },
  ForbiddenError: {
    type: '/errors/authorization/forbidden-access',
    title: 'Forbidden Access',
    statusCode: 403,
  },
  NotFoundError: {
    type: '/errors/resource-not-found',
    title: 'Resource Not Found',
    statusCode: 404,
  },
  DuplicateEntryError: {
    type: '/errors/conflict/duplicate-entry',
    title: 'Duplicate Entry',
    statusCode: 409,
  },
  InvalidDataError: {
    type: '/errors/validation/invalid-data',
    title: 'Invalid Data',
    statusCode: 400,
  },
  RelatedResourceNotFoundError: {
    type: '/errors/validation/related-resource-not-found',
    title: 'Related Resource Not Found',
    statusCode: 400,
  },
  CookieError: {
    type: '/errors/cookie-error',
    title: 'Cookie Processing Error',
    statusCode: 500,
  },
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  const instance = req.originalUrl;
  const originalMessage = err.message || 'An unexpected error occurred.';
  let problemDetails;

  // --- Normalized additional details ---
  const additionalErrorDetails =
    typeof err.errors === 'object' && err.errors !== null
      ? { ...err.errors }
      : err.errors
        ? { details: err.errors }
        : {};

  // --- Prisma DB errors ---
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    const mapping = prismaErrorMap[err.code];
    if (mapping) {
      statusCode = mapping.statusCode;
      problemDetails = createProblemDetails(
        mapping.type,
        mapping.title,
        statusCode,
        mapping.detail || mapping.getDetail?.(err),
        instance,
        mapping.extra ? mapping.extra(err) : {}
      );
    }
  }

  // --- Express-validator errors ---
  else if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
    statusCode = 400;
    problemDetails = createProblemDetails(
      '/errors/validation-error',
      'Validation Error',
      statusCode,
      err.message || 'Input validation failed.',
      instance,
      {
        invalid_params: err.errors.map((valError) => ({
          name: valError.path,
          reason: valError.msg,
          value: valError.value,
        })),
      }
    );
  }

  // --- JWT, CSRF, RateLimit, CORS errors ---
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    problemDetails = createProblemDetails(
      '/errors/authentication/invalid-token',
      'Invalid Token',
      statusCode,
      'The provided token is invalid or malformed.',
      instance
    );
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    problemDetails = createProblemDetails(
      '/errors/authentication/token-expired',
      'Token Expired',
      statusCode,
      'The provided token has expired.',
      instance
    );
  } else if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    problemDetails = createProblemDetails(
      '/errors/security/invalid-csrf-token',
      'Invalid CSRF Token',
      statusCode,
      'The CSRF token is invalid or missing.',
      instance
    );
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    problemDetails = createProblemDetails(
      '/errors/rate-limit-exceeded',
      'Rate Limit Exceeded',
      statusCode,
      originalMessage,
      instance
    );
  } else if (originalMessage.includes('CORS policy')) {
    statusCode = 403;
    problemDetails = createProblemDetails(
      '/errors/security/cors-violation',
      'CORS Error',
      statusCode,
      'This request was blocked by a CORS policy.',
      instance
    );
  }

  // --- Custom application errors via map ---
  else {
    const mapping = appErrorMap[err.name];
    if (mapping) {
      statusCode = err.statusCode || mapping.statusCode;
      problemDetails = createProblemDetails(
        mapping.type,
        mapping.title,
        statusCode,
        originalMessage,
        instance,
        additionalErrorDetails
      );
    }
  }

  // --- Fallback for unknown errors ---
  if (!problemDetails) {
    const title = err.name && err.name !== 'Error' ? err.name : 'Unknown Error';
    const type = `/errors/${(err.name || 'unknown').toLowerCase().replace(/error$/, '')}`;
    problemDetails = createProblemDetails(
      type,
      title,
      statusCode,
      originalMessage,
      instance,
      additionalErrorDetails
    );
  }

  // --- Environment-specific adjustments ---
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    problemDetails = createProblemDetails(
      '/errors/internal-server-error',
      'Internal Server Error',
      500,
      'An unexpected error occurred. We are looking into it.',
      instance
    );
  } else if (process.env.NODE_ENV !== 'production') {
    problemDetails.stack = err.stack;
  }

  // --- Final payload ---
  const outcome = statusCode < 500 ? 'fail' : 'error';
  const payload = {
    success: false,
    outcome,
    ...problemDetails,
  };

  logger.error(originalMessage, {
    statusCode,
    outcome,
    responsePayload: payload,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    originalError: {
      message: err.message,
      name: err.name,
      code: err.code,
    },
  });

  res.status(statusCode).json(payload);
};

export default errorHandler;

/*
Example error response:
{
  "success": false,
  "outcome": "fail",
  "type": "/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Input validation failed.",
  "instance": "/api/comments/post/123",
  "invalid_params": [...],
  "stack": "Error: ... at ..." // only in dev
}
*/
