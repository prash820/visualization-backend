// Production-ready error handling utilities
export class CustomError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public originalError?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'CustomError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, field?: string) {
    super(message, 400);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? ` with id: ${id}` : ''}`, 404);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
    this.code = 'FORBIDDEN';
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, field?: string) {
    super(message, 409);
    this.name = 'ConflictError';
    this.code = 'CONFLICT';
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMIT';
  }
}

// Error handler middleware
export const errorHandler = (error: any, req: any, res: any, next: any) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle known error types
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: {
        message: `${field} already exists`,
        code: 'DUPLICATE_KEY',
        field
      }
    });
  }

  // Handle MongoDB cast errors
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        code: 'INVALID_ID'
      }
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 