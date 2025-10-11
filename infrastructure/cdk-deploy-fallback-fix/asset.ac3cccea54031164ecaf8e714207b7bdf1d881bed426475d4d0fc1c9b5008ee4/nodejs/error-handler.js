/**
 * Error Handler - Shared utility for consistent error handling
 * Used by all Lambda functions for standardized error management
 */

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, type = 'GENERAL', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error types enumeration
 */
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMIT: 'RATE_LIMIT',
  EXTERNAL_API: 'EXTERNAL_API',
  INTERNAL: 'INTERNAL',
  TIMEOUT: 'TIMEOUT',
  GENERAL: 'GENERAL'
};

/**
 * Validate required parameters
 */
const validateRequiredParams = (obj, requiredParams, operation = 'operation') => {
  const missing = requiredParams.filter(param => !obj || obj[param] === undefined || obj[param] === null);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required parameters for ${operation}: ${missing.join(', ')}`,
      ERROR_TYPES.VALIDATION,
      400,
      { missingParams: missing, operation }
    );
  }
};

/**
 * Wrap function with timeout
 */
const withTimeout = async (fn, timeoutMs, operation = 'operation') => {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new AppError(
        `${operation} timed out after ${timeoutMs}ms`,
        ERROR_TYPES.TIMEOUT,
        408,
        { timeoutMs, operation }
      ));
    }, timeoutMs);

    try {
      const result = await fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
};

/**
 * Monitor performance of operations
 */
const monitorPerformance = async (fn, operation = 'operation', metadata = {}) => {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting ${operation}`, metadata);
    const result = await fn();
    const duration = Date.now() - startTime;
    console.log(`✅ Completed ${operation} in ${duration}ms`);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Failed ${operation} after ${duration}ms:`, error.message);
    throw error;
  }
};

/**
 * Wrap Lambda handler with error handling
 */
const wrapHandler = (handler) => {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      console.error('❌ Lambda handler error:', error);
      
      // Handle AppError instances
      if (error instanceof AppError) {
        return {
          statusCode: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: {
              message: error.message,
              type: error.type,
              details: error.details,
              timestamp: error.timestamp
            }
          })
        };
      }
      
      // Handle generic errors
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            type: ERROR_TYPES.INTERNAL,
            timestamp: new Date().toISOString()
          }
        })
      };
    }
  };
};

/**
 * Exponential backoff retry logic
 */
const exponentialBackoff = async (fn, maxRetries = 3, baseDelayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

module.exports = {
  AppError,
  ERROR_TYPES,
  validateRequiredParams,
  withTimeout,
  monitorPerformance,
  wrapHandler,
  exponentialBackoff
};