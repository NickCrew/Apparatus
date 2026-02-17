/**
 * Apparatus Client Errors
 * Custom error classes for API client operations
 */

/**
 * Base error class for all Apparatus errors
 */
export class ApparatusError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ApparatusError';
    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    };
  }
}

/**
 * Network-level errors (connection refused, DNS failure, etc.)
 */
export class NetworkError extends ApparatusError {
  constructor(
    message: string,
    public readonly url: string,
    cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
  }
}

/**
 * HTTP API errors (4xx, 5xx responses)
 */
export class ApiError extends ApparatusError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown
  ) {
    super(message, `HTTP_${status}`);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, body?: unknown): ApiError {
    return new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      body
    );
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/**
 * Request timeout errors
 */
export class TimeoutError extends ApparatusError {
  constructor(
    public readonly timeoutMs: number,
    public readonly url: string
  ) {
    super(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

/**
 * Validation errors (invalid parameters, malformed requests)
 */
export class ValidationError extends ApparatusError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * SSE connection errors
 */
export class SSEError extends ApparatusError {
  constructor(
    message: string,
    public readonly eventType?: string,
    cause?: Error
  ) {
    super(message, 'SSE_ERROR', cause);
    this.name = 'SSEError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ApparatusError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if an error is a Apparatus error
 */
export function isApparatusError(error: unknown): error is ApparatusError {
  return error instanceof ApparatusError;
}

/**
 * Type guard to check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
