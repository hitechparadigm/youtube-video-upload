/**
 * Shared HTTP Response Handler
 * Eliminates duplication across Lambda functions
 */

export const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,X-Amz-Security-Token',
    ...headers
  },
  body: JSON.stringify(body)
});

export const createErrorResponse = (statusCode, error, requestId) => 
  createResponse(statusCode, {
    error: typeof error === 'string' ? error : error.message,
    requestId,
    timestamp: new Date().toISOString()
  });
