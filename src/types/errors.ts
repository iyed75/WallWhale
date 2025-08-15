/**
 * Professional error handling classes and utilities
 */

/**
 * Base application error class
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    if (details) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Validation error - 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", true, details);
  }
}

/**
 * Authentication error - 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super(message, 401, "AUTHENTICATION_ERROR", true, details);
  }
}

/**
 * Authorization error - 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions", details?: Record<string, unknown>) {
    super(message, 403, "AUTHORIZATION_ERROR", true, details);
  }
}

/**
 * Not found error - 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND_ERROR", true, { resource, identifier });
  }
}

/**
 * Conflict error - 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT_ERROR", true, details);
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 429, "RATE_LIMIT_ERROR", true, {
      ...details,
      retryAfter,
    });
  }
}

/**
 * Internal server error - 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details?: Record<string, unknown>) {
    super(message, 500, "INTERNAL_SERVER_ERROR", false, details);
  }
}

/**
 * Service unavailable error - 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    service: string,
    message?: string,
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    const defaultMessage = `${service} service is currently unavailable`;
    super(message || defaultMessage, 503, "SERVICE_UNAVAILABLE_ERROR", true, {
      ...details,
      service,
      retryAfter,
    });
  }
}

/**
 * Business logic error - 422 Unprocessable Entity
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, "BUSINESS_LOGIC_ERROR", true, details);
  }
}

/**
 * External service error - 502 Bad Gateway
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName: string, message?: string, details?: Record<string, unknown>) {
    const defaultMessage = `External service ${serviceName} error`;
    super(message || defaultMessage, 502, "EXTERNAL_SERVICE_ERROR", true, {
      ...details,
      serviceName,
    });
  }
}

/**
 * Timeout error - 408 Request Timeout
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number, details?: Record<string, unknown>) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 408, "TIMEOUT_ERROR", true, {
      ...details,
      operation,
      timeout,
    });
  }
}

/**
 * File system error
 */
export class FileSystemError extends AppError {
  constructor(operation: string, path: string, cause?: string, details?: Record<string, unknown>) {
    super(
      `File system operation '${operation}' failed for path '${path}'${cause ? `: ${cause}` : ""}`,
      500,
      "FILE_SYSTEM_ERROR",
      true,
      { ...details, operation, path, cause }
    );
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(operation: string, cause?: string, details?: Record<string, unknown>) {
    super(
      `Database operation '${operation}' failed${cause ? `: ${cause}` : ""}`,
      500,
      "DATABASE_ERROR",
      false,
      { ...details, operation, cause }
    );
  }
}

/**
 * Steam service specific errors
 */
export class SteamError extends AppError {
  constructor(message: string, steamCode?: number, details?: Record<string, unknown>) {
    super(message, 422, "STEAM_ERROR", true, { ...details, steamCode });
  }
}

/**
 * DepotDownloader specific errors
 */
export class DepotDownloaderError extends AppError {
  constructor(message: string, exitCode?: number, details?: Record<string, unknown>) {
    super(message, 422, "DEPOT_DOWNLOADER_ERROR", true, { ...details, exitCode });
  }
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
  static fromStatusCode(
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ): AppError {
    switch (statusCode) {
      case 400:
        return new ValidationError(message, details);
      case 401:
        return new AuthenticationError(message, details);
      case 403:
        return new AuthorizationError(message, details);
      case 404:
        return new NotFoundError(message);
      case 409:
        return new ConflictError(message, details);
      case 408:
        return new TimeoutError("request", 30000, details);
      case 422:
        return new BusinessLogicError(message, details);
      case 429:
        return new RateLimitError(message, undefined, details);
      case 502:
        return new ExternalServiceError("unknown", message, details);
      case 503:
        return new ServiceUnavailableError("unknown", message, undefined, details);
      default:
        return new InternalServerError(message, details);
    }
  }

  static fromError(error: Error, defaultStatusCode = 500): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific error types
    if (error.name === "ValidationError") {
      return new ValidationError(error.message);
    }

    if (error.name === "PrismaClientKnownRequestError") {
      return new DatabaseError("database_operation", error.message);
    }

    if (error.name === "TimeoutError") {
      return new TimeoutError("operation", 30000);
    }

    // Default to internal server error
    return new InternalServerError(error.message, {
      originalError: error.name,
      originalStack: error.stack,
    });
  }
}

/**
 * Async error wrapper utility
 */
export function asyncErrorHandler<T extends unknown[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorFactory.fromError(error as Error);
    }
  };
}

/**
 * Error logging utility
 */
export interface ErrorLogger {
  error(error: AppError | Error, context?: Record<string, unknown>): void;
}

export function createErrorLogger(logger: any): ErrorLogger {
  return {
    error(error: AppError | Error, context?: Record<string, unknown>): void {
      const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof AppError
          ? {
              code: error.code,
              statusCode: error.statusCode,
              timestamp: error.timestamp,
              details: error.details,
              isOperational: error.isOperational,
            }
          : {}),
        context,
      };

      if (error instanceof AppError && error.isOperational && error.statusCode < 500) {
        logger.warn(errorInfo, "Operational error occurred");
      } else {
        logger.error(errorInfo, "Application error occurred");
      }
    },
  };
}

/**
 * Error response formatter
 */
export function formatErrorResponse(
  error: AppError | Error,
  requestId?: string,
  includeStack = false
) {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        requestId,
        details: error.details,
        ...(includeStack ? { stack: error.stack } : {}),
      },
    };
  }

  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: includeStack ? error.message : "Internal server error",
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId,
      ...(includeStack ? { stack: error.stack } : {}),
    },
  };
}
