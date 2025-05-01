class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = this.getStatusText(statusCode);
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  getStatusText(statusCode) {
    const statusMap = {
      // Success codes
      200: 'success',
      201: 'success',
      204: 'success',
      // Client error codes
      400: 'fail',
      401: 'fail',
      403: 'fail',
      404: 'fail',
      // Server error codes
      500: 'error',
      502: 'error',
      503: 'error'
    };
    return statusMap[statusCode] || 'error';
  }
}

export default AppError; 