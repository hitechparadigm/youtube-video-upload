/**
 * ⚠️ ERROR HANDLER UTILITY
 * 
 * Shared utility for unified error handling patterns across all Lambda functions.
 * Provides consistent error logging, response formatting, and retry logic.
 * 
 * KEY FEATURES:
 * - Structured logging with context information
 * - API Gateway response formatting
 * - Retry logic with exponential backoff for transient errors
 * - Error classification and handling strategies
 * - Performance monitoring and alerting integration
 */

/**
 * Error types for classification and handling
 */
export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  RATE_LIMIT: 'RateLimitError',
  EXTERNAL_API: 'ExternalAPIError',
  AWS_SERVICE: 'AWSServiceError',
  TIMEOUT: 'TimeoutError',
  INTERNAL: 'InternalError'
};

/**
 * HTTP status codes for different error types
 */
const ERROR_STATUS_CODES = {
  [ERROR_TYPES.VALIDATION]: 400,
  [ERROR_TYPES.AUTHENTICATION]: 401,
  [ERROR_TYPES.AUTHORIZATION]: 403,
  [ERROR_TYPES.NOT_FOUND]: 404,
  [ERROR_TYPES.CONFLICT]: 409,
  [ERROR_TYPES.RATE_LIMIT]: 429,
  [ERROR_TYPES.EXTERNAL_API]: 502,
  [ERROR_TYPES.AWS_SERVICE]: 503,
  [ERROR_TYPES.TIMEOUT]: 504,
  [ERROR_TYPES.INTERNAL]: 500
};

/**
 * Retryable error patterns
 */
const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ProvisionedThroughputExceededException',
  'ServiceUnavailable',
  'InternalServerError',
  'RequestTimeout',
  'TooManyRequestsException'
];

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.INTERNAL, statusCode = null, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode || ERROR_STATUS_CODES[type] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }
}

/**
 * Logs error with structured format and context
 * @param {Error} error - Error object to log
 * @param {Object} context - Additional context information
 * @param {string} level - Log level (error, warn, info)
 */
export function logError(error, context = {}, level = 'error') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: error.message,
    errorType: error.type || error.name || 'UnknownError',
    statusCode: error.statusCode || 500,
    stack: error.stack,
    context: {
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      requestId: context.requestId || context.awsRequestId,
      projectId: context.projectId,
      userId: context.userId,
      ...context
    },
    details: error.details || {}
  };

  // Use appropriate console method based on level
  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

/**
 * Creates standardized API Gateway response for errors
 * @param {Error} error - Error object
 * @param {Object} context - Request context
 * @returns {Object} API Gateway response object
 */
export function createErrorResponse(error, context = {}) {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const errorType = isAppError ? error.type : ERROR_TYPES.INTERNAL;

  // Log the error
  logError(error, context);

  // Create response body
  const responseBody = {
    error: true,
    type: errorType,
    message: error.message,
    timestamp: new Date().toISOString(),
    requestId: context.requestId || context.awsRequestId
  };

  // Include details for non-production environments or operational errors
  if (process.env.NODE_ENV !== 'production' || isAppError) {
    responseBody.details = error.details || {};
  }

  // Include stack trace for development
  if (process.env.NODE_ENV === 'development') {
    responseBody.stack = error.stack;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(responseBody)
  };
}

/**
 * Determines if an error should be retried
 * @param {Error} error - Error to check
 * @returns {boolean} Whether the error is retryable
 */
export function shouldRetry(error) {
  // Don't retry operational errors (validation, auth, etc.)
  if (error instanceof AppError && error.isOperational) {
    return error.type === ERROR_TYPES.RATE_LIMIT || error.type === ERROR_TYPES.TIMEOUT;
  }

  // Check for retryable AWS error patterns
  return RETRYABLE_ERRORS.some(pattern => 
    error.name?.includes(pattern) || error.message?.includes(pattern)
  );
}

/**
 * Calculates retry delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(attempt, baseDelay = 1000, maxDelay = 30000) {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * exponentialDelay;
  
  // Cap at maximum delay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Executes operation with retry logic
 * @param {Function} operation - Operation to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>} Operation result
 */
export async function executeWithRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    context = {}
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if not retryable or on last attempt
      if (!shouldRetry(error) || attempt > maxRetries) {
        break;
      }
      
      const delay = getRetryDelay(attempt, baseDelay, maxDelay);
      
      logError(error, {
        ...context,
        retryAttempt: attempt,
        nextRetryIn: delay,
        maxRetries
      }, 'warn');
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Wraps Lambda handler with error handling
 * @param {Function} handler - Lambda handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function wrapHandler(handler) {
  return async (event, context) => {
    try {
      const result = await handler(event, context);
      return result;
    } catch (error) {
      return createErrorResponse(error, {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        event: {
          httpMethod: event.httpMethod,
          path: event.path,
          resource: event.resource
        }
      });
    }
  };
}

/**
 * Validates required parameters and throws validation error if missing
 * @param {Object} params - Parameters to validate
 * @param {Array<string>} required - Required parameter names
 * @param {string} context - Context for error message
 */
export function validateRequiredParams(params, required, context = 'operation') {
  const missing = required.filter(param => 
    params[param] === undefined || params[param] === null || params[param] === ''
  );
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required parameters for ${context}: ${missing.join(', ')}`,
      ERROR_TYPES.VALIDATION,
      400,
      { missingParams: missing, providedParams: Object.keys(params) }
    );
  }
}

/**
 * Creates timeout wrapper for operations
 * @param {Function} operation - Operation to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error messages
 * @returns {Promise<any>} Operation result or timeout error
 */
export function withTimeout(operation, timeoutMs, operationName = 'operation') {
  return Promise.race([
    operation(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError(
          `${operationName} timed out after ${timeoutMs}ms`,
          ERROR_TYPES.TIMEOUT,
          504,
          { timeoutMs, operationName }
        ));
      }, timeoutMs);
    })
  ]);
}

/**
 * Handles AWS service errors and converts to AppError
 * @param {Error} error - AWS service error
 * @param {string} service - AWS service name
 * @param {string} operation - Operation that failed
 * @returns {AppError} Converted application error
 */
export function handleAWSError(error, service, operation) {
  let errorType = ERROR_TYPES.AWS_SERVICE;
  let statusCode = 503;

  // Map specific AWS errors to appropriate types
  switch (error.name) {
    case 'ValidationException':
      errorType = ERROR_TYPES.VALIDATION;
      statusCode = 400;
      break;
    case 'AccessDeniedException':
    case 'UnauthorizedOperation':
      errorType = ERROR_TYPES.AUTHORIZATION;
      statusCode = 403;
      break;
    case 'ResourceNotFoundException':
    case 'NoSuchKey':
      errorType = ERROR_TYPES.NOT_FOUND;
      statusCode = 404;
      break;
    case 'ThrottlingException':
    case 'TooManyRequestsException':
      errorType = ERROR_TYPES.RATE_LIMIT;
      statusCode = 429;
      break;
    case 'RequestTimeout':
      errorType = ERROR_TYPES.TIMEOUT;
      statusCode = 504;
      break;
  }

  return new AppError(
    `${service} ${operation} failed: ${error.message}`,
    errorType,
    statusCode,
    {
      awsError: error.name,
      service,
      operation,
      requestId: error.$metadata?.requestId
    }
  );
}

/**
 * Performance monitoring wrapper
 * @param {Function} operation - Operation to monitor
 * @param {string} operationName - Name for monitoring
 * @param {Object} context - Additional context
 * @returns {Promise<any>} Operation result with performance logging
 */
export async function monitorPerformance(operation, operationName, context = {}) {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    // Log performance metrics
    console.log(JSON.stringify({
      type: 'performance',
      operation: operationName,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
      context
    }));
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log performance metrics for failed operations
    console.log(JSON.stringify({
      type: 'performance',
      operation: operationName,
      duration,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      context
    }));
    
    throw error;
  }
}